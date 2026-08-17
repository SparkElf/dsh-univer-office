import { readFile } from "node:fs/promises";
import { Context } from "@deepseek-ai/cordis";
import SkillRegistry from "@deepseek-ai/dsh-skill";
import { apply } from "../lib/index.js";

const ctx = new Context();
new SkillRegistry(ctx);
apply(ctx, { tools: false, skills: true });
await new Promise((resolve) => setTimeout(resolve, 0));

const listed = await ctx.skills.list();
const names = listed.map((skill) => skill.name);
const expected = [
	"univer",
	"univer-base",
	"univer-board",
	"univer-cross-unit-formula",
	"univer-doc",
	"univer-embed",
	"univer-sheet",
	"univer-slide",
];
if (JSON.stringify(names) !== JSON.stringify(expected)) {
	throw new Error(`unexpected bundled skills: ${JSON.stringify(names)}`);
}

for (const candidate of listed) {
	const source = await readFile(
		new URL(`../skills/${candidate.name}/SKILL.md`, import.meta.url),
		"utf8",
	);
	const description = source.match(/^description: (.+)$/m)?.[1];
	if (description !== candidate.description) {
		throw new Error(`skill description drifted from frontmatter: ${candidate.name}`);
	}
}
const core = await ctx.skills.get("univer");
if (
	core === undefined ||
	!core.content.includes("univer_status") ||
	!core.content.includes("Do not wait for the user to name a tool") ||
	core.content.startsWith("---")
) {
	throw new Error("bundled core skill did not load its frontmatter-free body");
}

const slide = await ctx.skills.get("univer-slide");
if (
	slide === undefined ||
	!slide.description.includes("Use proactively") ||
	!slide.content.includes("univer_compile_svg") ||
	!slide.content.includes("univer_lint") ||
	!slide.content.includes("A new Slide Unit already contains one empty page")
) {
	throw new Error("bundled Slide skill is missing proactive generation guidance");
}

for (const topic of ["univer-embed", "univer-cross-unit-formula"]) {
	const skill = await ctx.skills.get(topic);
	if (skill === undefined || !skill.content.includes("univer_execute")) {
		throw new Error(`bundled topic skill did not load: ${topic}`);
	}
}

console.log("skills smoke OK (eight lazy bundled Univer skills)");
