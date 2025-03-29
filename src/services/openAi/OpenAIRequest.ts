import OpenAIInput from "./OpenAIInput";

interface OpenAIRequest {
    model: string;
    input: OpenAIInput[];  // Renamed to match API
    // messages: OpenAIInput[];  // Added to match API
    instructions: string;
}







export default OpenAIRequest;