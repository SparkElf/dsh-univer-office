import { Context } from "@deepseek-ai/cordis";
import SkillRegistry from "@deepseek-ai/dsh-skill";
import { apply } from "../lib/index.js";

const ctx = new Context();
new SkillRegistry(ctx);
apply(ctx, { tools: false, skills: true });
await new Promise((resolve) => setTimeout(resolve, 0));

const names = (await ctx.skills.list()).map((skill) => skill.name);
const expected = ["univer", "univer-base", "univer-board", "univer-doc", "univer-sheet", "univer-slide"];
if (JSON.stringify(names) !== JSON.stringify(expected)) {
	throw new Error(`unexpected bundled skills: ${JSON.stringify(names)}`);
}
const core = await ctx.skills.get("univer");
if (core === undefined || !core.content.includes("univer_status") || core.content.startsWith("---")) {
	throw new Error("bundled core skill did not load its frontmatter-free body");
}

console.log("skills smoke OK (six lazy bundled Univer skills)");
