import { type ActionFunctionArgs, json } from "@remix-run/node";
import { getThemeConfig, saveThemeConfig } from "~/lib/theme.server";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const mode = formData.get("mode") as "light" | "dark";

  if (!mode || (mode !== "light" && mode !== "dark")) {
    return json({ error: "Invalid mode" }, { status: 400 });
  }

  try {
    // 현재 테마 설정 가져오기
    const currentTheme = await getThemeConfig();

    // 모드만 변경하여 저장
    const updatedTheme = {
      ...currentTheme,
      mode
    };

    await saveThemeConfig(updatedTheme);

    return json({ mode, success: true });
  } catch (error) {
    console.error("테마 토글 실패:", error);
    return json({ error: "Failed to toggle theme" }, { status: 500 });
  }
}
