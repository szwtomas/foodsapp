import type { Request, Response } from "express";
import { userRepository } from "../repository/userRepository";
import { userExpectedDailyCaloriesRepository } from "../repository/userExpectedDailyCaloriesRepository";

export const usersController = {
    async getAllUsers(req: Request, res: Response): Promise<void> {
        res.status(200).json(userRepository.getAllUsers());
    },

    async getCalores(req: Request, res: Response): Promise<void> {
        const calores = userExpectedDailyCaloriesRepository.getAll();
        res.status(200).json(calores);
    }
}
