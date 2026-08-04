import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/session";

const schema = z.object({
  videoId: z.string().trim().min(1).max(50),
  videoTitle: z.string().trim().min(1).max(300),
  channelName: z.string().trim().max(200).optional(),
});

type GeminiPart = {
  text?: string;
  file_data?: { file_uri: string; mime_type?: string };
};

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  error?: { message?: string };
};

async function callGemini(parts: GeminiPart[], apiKey: string, model: string) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 1024,
      },
    }),
  });

  const data = (await res.json()) as GeminiResponse;
  if (!res.ok) {
    throw new Error(data.error?.message || `Gemini API 오류 (${res.status})`);
  }

  const text = data.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? "")
    .join("")
    .trim();

  if (!text) {
    throw new Error("요약 결과를 받지 못했습니다");
  }
  return text;
}

/** 재생 중인 YouTube 영상을 Gemini로 요약 */
export async function POST(req: Request) {
  const authz = await requireUser();
  if ("error" in authz) return authz.error;

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "GEMINI_API_KEY가 설정되지 않았습니다. Google AI Studio에서 키를 발급해 .env / Vercel에 추가하세요.",
      },
      { status: 503 },
    );
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { videoId, videoTitle, channelName } = parsed.data;
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";

  const prompt = [
    "당신은 유튜브 영상 요약 도우미입니다.",
    "아래 영상의 주요 내용을 한국어로 간결하게 요약하세요.",
    "형식:",
    "1) 한 줄 핵심 요약",
    "2) 주요 포인트 3~6개 불릿",
    "추측이 필요하면 '추정'이라고 표시하고, 광고·스폰서 멘트는 생략하세요.",
    "",
    `제목: ${videoTitle}`,
    channelName ? `채널: ${channelName}` : "",
    `URL: ${videoUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    // 공개 YouTube URL을 Gemini에 직접 전달 (video understanding)
    const summary = await callGemini(
      [
        { file_data: { file_uri: videoUrl } },
        { text: prompt },
      ],
      apiKey,
      model,
    );

    return NextResponse.json({
      summary,
      model,
      mode: "youtube_url",
      videoUrl,
    });
  } catch (primaryErr) {
    // YouTube URL 처리 실패 시 제목·채널 기반 보조 요약
    try {
      const fallbackPrompt = [
        prompt,
        "",
        "참고: 영상 본문에 직접 접근할 수 없어 제목과 채널 정보만으로 가능한 범위에서 요약하세요.",
        "본문 확인이 필요한 내용은 추정으로 표시하세요.",
      ].join("\n");

      const summary = await callGemini([{ text: fallbackPrompt }], apiKey, model);
      return NextResponse.json({
        summary,
        model,
        mode: "metadata_fallback",
        videoUrl,
        warning:
          primaryErr instanceof Error
            ? primaryErr.message
            : "영상 직접 분석에 실패해 제목 기반 요약을 제공합니다.",
      });
    } catch (fallbackErr) {
      console.error("[videos/summarize]", primaryErr, fallbackErr);
      const message =
        fallbackErr instanceof Error
          ? fallbackErr.message
          : "요약 생성에 실패했습니다";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }
}
