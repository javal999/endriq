import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_COACH } from "@/lib/llm/prompts";

function modelName(): string {
  return (
    process.env.ANTHROPIC_MODEL?.trim() ||
    "claude-haiku-4-5"
  );
}

export async function completeAnthropic(args: {
  user: string;
  maxTokens?: number;
  outputSchema?: Record<string, unknown>;
  /** Override the default SYSTEM_COACH prompt (used for translation calls). */
  systemOverride?: string;
}): Promise<{
  text: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
}> {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");

  const client = new Anthropic({ apiKey: key });
  const model = modelName();
  const msg = await client.messages.create({
    model,
    max_tokens: args.maxTokens ?? 900,
    system: args.systemOverride ?? SYSTEM_COACH,
    messages: [{ role: "user", content: args.user }],
    ...(args.outputSchema
      ? {
          output_config: {
            format: {
              type: "json_schema" as const,
              schema: args.outputSchema,
            },
          },
        }
      : {}),
  });

  let text = "";
  for (const block of msg.content) {
    if (block.type === "text") text += block.text;
  }

  return {
    text,
    inputTokens: msg.usage.input_tokens,
    outputTokens: msg.usage.output_tokens,
    model,
  };
}
