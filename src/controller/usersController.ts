import type { Request, Response } from "express";
import { userRepository } from "../repository/userRepository";

export const usersController = {
    async getAllUsers(req: Request, res: Response): Promise<void> {
        res.status(200).json(userRepository.getAllUsers());
    }
}
