import { pipeline } from '@huggingface/transformers';

const pipe = await pipeline('image-to-text', 'Xenova/vit-gpt2-image-captioning'); 

const prompt = "detect the photo. name ingredients."