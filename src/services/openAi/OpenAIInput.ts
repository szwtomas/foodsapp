

type OpenAIContent = OpenAIText | OpenAIImage | OpenAIAudio;

interface OpenAIText {
    type: "input_text";
    text: string;
}

interface OpenAIImage {
    type: "input_image";
    image_url: string;
    detail: string;
}

interface OpenAIAudio {
    type: "input_audio";
    audio_url: string;
}


interface OpenAIInput {
    role: "user" | "system";
    content: OpenAIContent[];  // Matches API
}


export default OpenAIInput;