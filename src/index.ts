import dotenv from 'dotenv';
import express, { Express } from 'express';
import { IgApiClient } from 'instagram-private-api';
import { get } from 'request-promise';
import { CronJob } from 'cron';
import OpenAI from "openai";
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

dotenv.config();

const systemPrompt = `
quadcat yuou need to like figure this out or else you will fail the math test................
like do you even remevber whjat an asymptote is

breh
`

const imagePrompt = `
generate an image catctactacatcatcat
`

const captionPrompt = `
generate a caption for the image catctactacatcatcat
`

const generateImage = async (prompt: string): Promise<string> => {
    const response = await openai.responses.create({
        model: "gpt-4.1-mini",
        input: systemPrompt + imagePrompt,
        tools: [{ type: "image_generation" }],
    });
      
    const imageData = response.output
        .filter((output) => output.type === "image_generation_call")
        .map((output) => output.result);

    if (!imageData || imageData.length === 0 || !imageData[0]) {
        throw new Error('No image URL was generated');
    }

    return imageData[0];
}

const generateCaption = async (imageUrl: string): Promise<string> => {
    const response = await openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
            {
                role: "user",
                content: [
                    { type: "text", text: systemPrompt + captionPrompt },
                    {
                        type: "image_url",
                        image_url: {
                            url: imageUrl
                        }
                    }
                ]
            }
        ],
        max_tokens: 300
    });

    const caption = response.choices[0]?.message?.content;
    if (!caption) {
        throw new Error('No caption was generated');
    }

    return caption;
}


const app: Express = express();
const port: number = process.env.PORT ? parseInt(process.env.PORT) : 4000;

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

const postToInsta = async (): Promise<void> => {
    const ig: IgApiClient = new IgApiClient();
    ig.state.generateDevice(process.env.IG_USERNAME || '');
    await ig.account.login(process.env.IG_USERNAME || '', process.env.IG_PASSWORD || '');

    try {
        const imageUrl = await generateImage(imagePrompt);
        const caption = await generateCaption(imageUrl);
        const imageBuffer: Buffer = await get({
            url: imageUrl,
            encoding: null, 
        });

        await ig.publish.photo({
            file: imageBuffer,
            caption: caption,
        });
    } catch (error) {
        console.error('Failed to post to Instagram:', error);
        throw error;
    }
};

const cronInsta: CronJob = new CronJob("30 5 * * *", async () => {
    await postToInsta();
});

cronInsta.start();