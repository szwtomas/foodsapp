import type { Request, Response } from "express";

export const healthCheckController = {
    async checkApiKey(req: Request, res: Response): Promise<void> {
        res.status(200).send("0");
    }
}
