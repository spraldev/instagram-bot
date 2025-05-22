"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const instagram_private_api_1 = require("instagram-private-api");
const request_promise_1 = require("request-promise");
const cron_1 = require("cron");
const openai_1 = __importDefault(require("openai"));
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
dotenv_1.default.config();
const systemPrompt = `
quadcat yuou need to like figure this out or else you will fail the math test................
like do you even remevber whjat an asymptote is

breh
`;
const imagePrompt = `
generate an image catctactacatcatcat
`;
const captionPrompt = `
generate a caption for the image catctactacatcatcat
`;
const generateImage = async (prompt) => {
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
};
const generateCaption = async (imageUrl) => {
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
};
const app = (0, express_1.default)();
const port = process.env.PORT ? parseInt(process.env.PORT) : 4000;
app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});
const postToInsta = async () => {
    const ig = new instagram_private_api_1.IgApiClient();
    ig.state.generateDevice(process.env.IG_USERNAME || '');
    await ig.account.login(process.env.IG_USERNAME || '', process.env.IG_PASSWORD || '');
    try {
        const imageUrl = await generateImage(imagePrompt);
        const caption = await generateCaption(imageUrl);
        const imageBuffer = await (0, request_promise_1.get)({
            url: imageUrl,
            encoding: null,
        });
        await ig.publish.photo({
            file: imageBuffer,
            caption: caption,
        });
    }
    catch (error) {
        console.error('Failed to post to Instagram:', error);
        throw error;
    }
};
const cronInsta = new cron_1.CronJob("30 5 * * *", async () => {
    await postToInsta();
});
cronInsta.start();
//# sourceMappingURL=index.js.map