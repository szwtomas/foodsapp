import type { Request, Response } from "express";

export const usersController = {
    async getAllUsers(req: Request, res: Response): Promise<void> {
        res.status(200).send("0");
    }
}
