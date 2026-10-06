import { GoogleGenAI, Type } from "@google/genai";
import {
  AnalyzeProjectHealthBody,
  AnalyzeProjectHealthResponse,
  GenerateProjectBriefBody,
  GenerateProjectBriefResponse,
  ScoreProjectMatchBody,
  ScoreProjectMatchResponse,
  GenerateSkillGapPlanBody,
  GenerateSkillGapPlanResponse,
} from "@workspace/api-zod";
import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();
const MODEL = "gemini-2.5-flash";
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 12;
const requestsByAddress = new Map<string, { count: number; expiresAt: number }>();

function isRateLimited(address: string): boolean {
  const now = Date.now();
  const current = requestsByAddress.get(address);
  if (!current || current.expiresAt <= now) {
    requestsByAddress.set(address, { count: 1, expiresAt: now + WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > MAX_REQUESTS_PER_WINDOW;
}

function createAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  return apiKey ? new GoogleGenAI({ apiKey }) : null;
}

async function generateJson(
  prompt: string,
  responseSchema: Record<string, unknown>,
): Promise<unknown> {
  const ai = createAiClient();
  if (!ai) {
    throw new Error("AI_NOT_CONFIGURED");
  }
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema,
    },
  });
  if (!response.text) throw new Error("AI_EMPTY_RESPONSE");
  return JSON.parse(response.text) as unknown;
}

function invalidBody(res: Response, message: string) {
  res.status(400).json({ error: message });
}

function requestFailed(
  req: Request,
  res: Response,
  error: unknown,
) {
  if (error instanceof Error && error.message === "AI_NOT_CONFIGURED") {
    res.status(503).json({ error: "AI recommendations are temporarily unavailable." });
    return;
  }
  req.log.error({ err: error }, "AI recommendation request failed");
  res.status(502).json({ error: "The AI service could not complete this request. Please try again." });
}

router.post("/ai/project-health", async (req, res): Promise<void> => {
  const parsed = AnalyzeProjectHealthBody.safeParse(req.body);
  if (!parsed.success) {
    invalidBody(res, "Please provide a complete project title, description, budget, deadline, and skills.");
    return;
  }
  if (isRateLimited(req.ip ?? "unknown")) {
    res.status(429).json({ error: "Too many AI requests. Please wait a minute and try again." });
    return;
  }
  try {
    const input = parsed.data;
    const output = await generateJson(
      `You are a careful freelance project advisor. Assess the project based only on the supplied information. Do not make guarantees or invent facts. Explain budget and deadline uncertainty. Return actionable recommendations. Project: ${JSON.stringify(input)}`,
      {
        type: Type.OBJECT,
        required: ["riskLevel", "scopeAssessment", "budgetAssessment", "deadlineAssessment", "missingInformation", "recommendations"],
        properties: {
          riskLevel: { type: Type.STRING, enum: ["low", "medium", "high"] },
          scopeAssessment: { type: Type.STRING },
          budgetAssessment: { type: Type.STRING },
          deadlineAssessment: { type: Type.STRING },
          missingInformation: { type: Type.ARRAY, items: { type: Type.STRING } },
          recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
      },
    );
    res.json(AnalyzeProjectHealthResponse.parse(output));
  } catch (error) {
    requestFailed(req, res, error);
  }
});

router.post("/ai/project-brief", async (req, res): Promise<void> => {
  const parsed = GenerateProjectBriefBody.safeParse(req.body);
  if (!parsed.success) {
    invalidBody(res, "Enter a project description with at least 20 characters.");
    return;
  }
  if (isRateLimited(req.ip ?? "unknown")) {
    res.status(429).json({ error: "Too many AI requests. Please wait a minute and try again." });
    return;
  }
  try {
    const output = await generateJson(
      `Turn this rough freelance project description into a clear, realistic brief. Do not add requirements that are not implied by the source. Keep the output practical and label risks as possibilities. Source: ${JSON.stringify(parsed.data.description)}`,
      {
        type: Type.OBJECT,
        required: ["projectGoal", "mustHave", "niceToHave", "requiredSkills", "deliverables", "experienceLevel", "risks", "questions"],
        properties: {
          projectGoal: { type: Type.STRING },
          mustHave: { type: Type.ARRAY, items: { type: Type.STRING } },
          niceToHave: { type: Type.ARRAY, items: { type: Type.STRING } },
          requiredSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
          deliverables: { type: Type.ARRAY, items: { type: Type.STRING } },
          experienceLevel: { type: Type.STRING, enum: ["beginner", "intermediate", "expert", "any"] },
          risks: { type: Type.ARRAY, items: { type: Type.STRING } },
          questions: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
      },
    );
    res.json(GenerateProjectBriefResponse.parse(output));
  } catch (error) {
    requestFailed(req, res, error);
  }
});

router.post("/ai/match", async (req, res): Promise<void> => {
  const parsed = ScoreProjectMatchBody.safeParse(req.body);
  if (!parsed.success) {
    invalidBody(res, "Provide the project and freelancer details to compare.");
    return;
  }
  if (isRateLimited(req.ip ?? "unknown")) {
    res.status(429).json({ error: "Too many AI requests. Please wait a minute and try again." });
    return;
  }
  try {
    const output = await generateJson(
      `Compare the project and freelancer for compatibility. Scores are estimates, not facts; base every statement only on supplied data. Give fresh talent a fair evaluation based on skill and portfolio evidence rather than penalizing zero years alone. Return concise reasoning. Input: ${JSON.stringify(parsed.data)}`,
      {
        type: Type.OBJECT,
        required: ["matchScore", "skillsScore", "experienceScore", "budgetScore", "availabilityScore", "portfolioScore", "feedbackScore", "matchingSkills", "missingSkills", "reason", "recommendation"],
        properties: {
          matchScore: { type: Type.INTEGER, minimum: 0, maximum: 100 },
          skillsScore: { type: Type.INTEGER, minimum: 0, maximum: 100 },
          experienceScore: { type: Type.INTEGER, minimum: 0, maximum: 100 },
          budgetScore: { type: Type.INTEGER, minimum: 0, maximum: 100 },
          availabilityScore: { type: Type.INTEGER, minimum: 0, maximum: 100 },
          portfolioScore: { type: Type.INTEGER, minimum: 0, maximum: 100 },
          feedbackScore: { type: Type.INTEGER, minimum: 0, maximum: 100 },
          matchingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
          missingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
          reason: { type: Type.STRING },
          recommendation: { type: Type.STRING },
        },
      },
    );
    res.json(ScoreProjectMatchResponse.parse(output));
  } catch (error) {
    requestFailed(req, res, error);
  }
});

router.post("/ai/skill-gap", async (req, res): Promise<void> => {
  const parsed = GenerateSkillGapPlanBody.safeParse(req.body);
  if (!parsed.success) {
    invalidBody(res, "Provide the project and current freelancer skills.");
    return;
  }
  if (isRateLimited(req.ip ?? "unknown")) {
    res.status(429).json({ error: "Too many AI requests. Please wait a minute and try again." });
    return;
  }
  try {
    const output = await generateJson(
      `Compare the skills needed for this project with the freelancer's existing skills. Create a short preparation path only for actual skill gaps. Effort estimates are approximate and must not be presented as guarantees. Input: ${JSON.stringify(parsed.data)}`,
      {
        type: Type.OBJECT,
        required: ["matchScore", "matchingSkills", "missingSkills", "preparationPlan", "readinessSummary"],
        properties: {
          matchScore: { type: Type.INTEGER, minimum: 0, maximum: 100 },
          matchingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
          missingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
          preparationPlan: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              required: ["skill", "topics", "order", "effort", "tip"],
              properties: {
                skill: { type: Type.STRING },
                topics: { type: Type.ARRAY, items: { type: Type.STRING } },
                order: { type: Type.INTEGER },
                effort: { type: Type.STRING },
                tip: { type: Type.STRING },
              },
            },
          },
          readinessSummary: { type: Type.STRING },
        },
      },
    );
    res.json(GenerateSkillGapPlanResponse.parse(output));
  } catch (error) {
    requestFailed(req, res, error);
  }
});

export default router;
