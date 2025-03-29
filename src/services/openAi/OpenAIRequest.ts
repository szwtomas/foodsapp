interface OpenAIRequest {
    model: string;
    input: OpenAIInput[];  // Renamed to match API
    // messages: OpenAIInput[];  // Added to match API
    instructions: string;
}


type OpenAIContent = OpenAIText | OpenAIImage;

interface OpenAIText {
    type: "input_text";
    text: string;
}

interface OpenAIImage {
    type: "input_image";
    image_url: string;
    detail: string;
}

interface OpenAIInput {
    role: "user" | "system";
    content: OpenAIContent[];  // Matches API
}






export default OpenAIRequest;
