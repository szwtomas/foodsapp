

type OpenAIContent = OpenAIText | OpenAIImage | OpenAIAudio;

interface OpenAIText {
    type: "text";
    text: string;
}

interface OpenAIImage {
    type: "image";
    image: URL;
}

interface OpenAIAudio {
    type: "input_audio";
    audio_url: string;
}


interface OpenAIInput {
    role: "user" 
    // | "bot";
    content: OpenAIContent[];  // Matches API
}


export default OpenAIInput;