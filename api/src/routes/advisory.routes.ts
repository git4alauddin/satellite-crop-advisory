import { Router } from "express";
import { getAdvisory } from "../controllers/advisory.controller.js";

const advisoryRouter = Router();

advisoryRouter.get("/advisory", getAdvisory);

export default advisoryRouter;
