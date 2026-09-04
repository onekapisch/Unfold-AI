import { buildAnswerMap } from "../src/core/answer-map/buildAnswerMap";
import { buildSemanticDocument } from "../src/core/document/semanticDocument";
import { summarizeExtractively } from "../src/core/summary/extractiveSummary";
import { mountAnswerExperience } from "../src/content/ui/answerExperience";
import brandArtwork from "../assets/brand/unfold-paper-map.png";

const stage = document.getElementById("stage");
const shot = Number.parseInt(new URLSearchParams(location.search).get("shot") ?? "1", 10);
const copy = [
  ["Understand any long answer in seconds", "A faithful local summary keeps the original response one click away."],
  ["Jump to the part you need", "The Answer Map turns a wall of text into a precise, clickable outline."],
  ["Find actions, sources, and code", "Switch views to locate next steps and real links already present in the answer."],
  ["Save the insight, not the whole chat", "Keep exact source text with notes and a link back—searchable on this device."],
  ["Private by design", "No account. No cloud API. No conversation analytics. Your answers stay in your browser."],
][Math.max(0, Math.min(4, shot - 1))];

function element(name: string, className?: string, text?: string): HTMLElement {
  const node = document.createElement(name); if (className) node.className = className; if (text) node.textContent = text; return node;
}

function heading(): HTMLElement {
  const wrap = element("div", "headline"); wrap.append(element("h1", "", copy[0]), element("p", "", copy[1])); return wrap;
}

function answerDemo(): HTMLElement {
  const app = element("div", "browser");
  const bar = element("div", "browser-bar"); bar.append(element("i"), element("i"), element("i"), element("span", "", "AI workspace · Deployment plan"));
  const conversation = element("div", "conversation");
  const prompt = element("div", "prompt", "How should we evaluate and roll out a smaller AI model safely?");
  const answer = element("article", "answer"); answer.setAttribute("data-message-author-role", "assistant");
  const root = element("div", "answer-content");
  root.innerHTML = `<h2>Choose a representative evaluation</h2><p>Measure latency and total cost before choosing a model. Use real tasks from the target workflow and record a baseline.</p><h2>Define quality guardrails</h2><p>Compare output quality against the current system before rollout.</p><ul><li>Document the approval threshold.</li><li>Test the fallback path.</li></ul><h2>Control operating cost</h2><p>Track input volume, output volume, latency, and total cost together.</p><h2>Ship safely</h2><p>Use a staged rollout and review <a href="https://example.com/evaluation-guide">the evaluation guide</a> before expanding traffic.</p><pre><code class="language-js">const approved = quality &gt;= threshold;</code></pre><h2>Monitor the rollout</h2><p>Review regressions and user feedback after every traffic increase.</p>`;
  answer.append(root); conversation.append(prompt, answer); app.append(bar, conversation);
  const model = buildSemanticDocument(root, "store-demo");
  const host = document.createElement("unfold-ai-root"); root.before(host);
  mountAnswerExperience({ host, documentModel:model, summary:summarizeExtractively(model), mapEntries:buildAnswerMap(model), callbacks:{onShowNext(){},onPrevious(){},onShowFull(){},onCollapse(){},onNavigate(){},onSave(){}} });
  if (shot === 2) host.shadowRoot?.querySelector<HTMLButtonElement>("[data-action='full']")?.click();
  if (shot === 3) host.shadowRoot?.querySelector<HTMLButtonElement>("[data-tab='source']")?.click();
  return app;
}

function savedDemo(): HTMLElement {
  const panel = element("div", "saved-demo");
  const tools = element("div", "saved-tools"); tools.append(element("div", "search-demo", "⌕  Search saved insights"), element("button", "", "All providers"), element("button", "", "Export Markdown"));
  const cards = [
    ["COST GUARDRAILS", "Measure latency and total cost before choosing a model.", "Use this in the launch review."],
    ["SAFE ROLLOUT", "Use a staged rollout and test the fallback path.", "Owner: platform team"],
    ["QUALITY THRESHOLD", "Compare output quality against the current system.", "Review on Friday"],
  ].map(([title,text,note]) => { const card=element("article"); card.append(element("small","","CHATGPT · TODAY"),element("h2","",title),element("blockquote","",text),element("p","",note)); return card; });
  panel.append(tools,...cards); return panel;
}

function privacyDemo(): HTMLElement {
  const panel=element("div","privacy-demo"); const art=document.createElement("img"); art.src=brandArtwork; art.alt="";
  const facts=element("div","privacy-facts"); facts.append(element("h2","","Your answer never becomes our data."),...[
    "Summary processing stays on device","Saved insights stay in local browser storage","No account, cloud API, ads, or tracking SDK"
  ].map((value)=>{const p=element("p");p.append(element("i"),document.createTextNode(value));return p;})); panel.append(art,facts); return panel;
}

if (stage) { stage.append(heading(), shot <= 3 ? answerDemo() : shot === 4 ? savedDemo() : privacyDemo()); }
