const allParas = document.querySelectorAll('.lexo-paragraph');
const notification = document.getElementById('notification');
const phraseBtn = document.getElementById('phrase-move-btn');
const paraBtn = document.getElementById('para-move-btn');
const container = document.getElementById('micro-panel');
const menu = document.getElementById('quick-menu');
const indexList = document.getElementById('index-list');

let modeState = "NONE"; 
let phraseStage = 0;    
let paraStage = 0;      
let rangeStart = null;
let selectedContent = null; 
let currentFontSize = 16;
let currentTab = 'anchors';

let dataAnchors = [{ text: "Chapter 1 Begin" }, { text: "第三章核心冲突爆发" }];
let dataKeywords = [{ text: "Masada" }, { text: "碎石资料" }];

window.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

function globalReset() {
    allParas.forEach(p => p.classList.remove('is-locked', 'activated'));
    if (phraseBtn) phraseBtn.classList.remove('btn-active');
    if (paraBtn) paraBtn.classList.remove('btn-active');
    phraseStage = 0; paraStage = 0; rangeStart = null; selectedContent = null;
}

if (phraseBtn) {
    phraseBtn.addEventListener('click', () => {
        if (modeState === "PHRASE") { modeState = "NONE"; globalReset(); notification.innerHTML = "❌ 字句位移模式已关闭"; } 
        else { globalReset(); modeState = "PHRASE"; phraseBtn.classList.add('btn-active'); notification.innerHTML = "💡 字句位移激活：请双击划选【字句起点】"; }
    });
}

if (paraBtn) {
    paraBtn.addEventListener('click', () => {
        if (modeState === "PARA") { modeState = "NONE"; globalReset(); notification.innerHTML = "❌ 段落搬运模式已关闭"; } 
        else { globalReset(); modeState = "PARA"; paraBtn.classList.add('btn-active'); notification.innerHTML = "📦 段落搬运激活：双击锁定段落"; }
    });
}

// 核心状态机驱动：彻底放宽目标段落的捕获条件
document.addEventListener('dblclick', function(e) {
    // 无论是双击了文字本身、内部的 span 卡片，还是段落边缘，都往上精准捞出宿主段落
    const targetPara = e.target.closest('.lexo-paragraph');
    if (!targetPara) return;

    // A 分支：字句位移状态机
    if (modeState === "PHRASE") {
        const selection = window.getSelection();
        if (phraseStage === 0) {
            if (selection.rangeCount === 0) return;
            rangeStart = selection.getRangeAt(0).cloneRange();
            phraseStage = 1;
            notification.innerHTML = "📍 起点已定，请双击【字句末尾】...";
        } 
        else if (phraseStage === 1) {
            if (selection.rangeCount === 0) return;
            const rangeEnd = selection.getRangeAt(0).cloneRange();
            const finalRange = document.createRange();
            try {
                finalRange.setStart(rangeStart.startContainer, rangeStart.startOffset);
                finalRange.setEnd(rangeEnd.endContainer, rangeEnd.endOffset);

                const spanCard = document.createElement('span');
                spanCard.className = 'is-card phrase-card';
                spanCard.contentEditable = "true";
                
                finalRange.surroundContents(spanCard);
                selectedContent = spanCard;

                allParas.forEach(p => { if (!p.contains(spanCard)) p.classList.add('is-locked'); });
                phraseStage = 2;
                notification.innerHTML = "✨ 字句已转为【反色方块】，请双击其他目标段落搬运！";
            } catch (err) {
                notification.innerHTML = "⚠️ 选定无效，请确保两次双击在同一段落内。";
                globalReset();
            }
        } 
        else if (phraseStage === 2) {
            // 只要双击的目标段落不是反色块自己所在的段落，立刻物理追加
            if (selectedContent && !targetPara.contains(selectedContent)) {
                targetPara.appendChild(selectedContent);
                notification.innerHTML = "🚀 字句卡片跨段落追加成功！";
                globalReset();
            }
        }
    }
    
    // B 分支：段落搬运状态机
    else if (modeState === "PARA") {
        if (paraStage === 0) {
            selectedContent = targetPara;
            selectedContent.classList.add('activated');
            allParas.forEach(p => { if (p !== selectedContent) p.classList.add('is-locked'); });
            paraStage = 1;
            notification.innerHTML = "📌 段落已锁定！请双击【另一个段落】。";
        } 
        else if (paraStage === 1) {
            // 只要双击的是另一个不同的段落，立刻执行大挪移
            if (selectedContent && targetPara !== selectedContent) {
                targetPara.parentNode.insertBefore(selectedContent, targetPara.nextSibling);
                notification.innerHTML = "🚀 整个段落物理大挪移成功！";
                globalReset();
            } else {
                notification.innerHTML = "↩️ 已取消段落锁定";
                globalReset();
            }
        }
    }
});

function keepTypewriterCenter() {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (rect.top !== 0 && container) {
            const containerRect = container.getBoundingClientRect();
            container.scrollTop += (rect.top - containerRect.top - (containerRect.height / 2));
        }
    }
}
if (container) container.addEventListener('input', keepTypewriterCenter);

function scrollByLines(direction) {
    if (!container) return;
    let lines = 30;
    if (currentFontSize >= 18) lines = Math.floor(container.clientHeight / 40);
    container.scrollTop += (direction === 'down' ? lines * 25 : -lines * 25);
}
function scrollToExtreme(position) { 
    if (!container) return;
    container.scrollTop = (position === 'top' ? 0 : container.scrollHeight); 
}

function sanitizeAnchorText(text) {
    return /[\u4e00-\u9fa5]/.test(text) ? text.substring(0, 10) : text.substring(0, 20);
}
function switchTab(tab) {
    currentTab = tab;
    document.getElementById('tab-anchors').classList.toggle('active-tab', tab === 'anchors');
    document.getElementById('tab-keywords').classList.toggle('active-tab', tab === 'keywords');
    renderDrawerList();
}
function renderDrawerList() {
    if (!indexList) return;
    indexList.innerHTML = '';
    const listData = currentTab === 'anchors' ? dataAnchors : dataKeywords;
    listData.forEach(item => {
        const li = document.createElement('li');
        li.textContent = sanitizeAnchorText(item.text);
        li.onclick = () => {
            if (!container) return;
            const text = container.innerText;
            let idx = text.indexOf(item.text);
            if (idx === -1) return;
            
            const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
            let node, charCount = 0;
            while (node = walker.nextNode()) {
                if (charCount + node.length >= idx) {
                    const range = document.createRange();
                    range.setStart(node, idx - charCount);
                    range.setEnd(node, idx - charCount + item.text.length);
                    const sel = window.getSelection();
                    sel.removeAllRanges(); sel.addRange(range);
                    keepTypewriterCenter();
                    notification.innerHTML = `⚓ 索引柜瞬移至: "${item.text}"`;
                    break;
                }
                charCount += node.length;
            }
        };
        indexList.appendChild(li);
    });
}

function markGravelParagraph() {
    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
        sel.getRangeAt(0).insertNode(document.createTextNode("▰ "));
        notification.innerHTML = "▰ 碎石记号已打上。";
    }
}

window.addEventListener('dblclick', (e) => {
    if (e.target === document.body || e.target === container) {
        if (menu) menu.classList.toggle('menu-hidden');
    }
});

function changeFontSize(size) { document.body.className = document.body.className.replace(/size-\d+/, `size-${size}`); currentFontSize = size; }
function changeColorMode(mode) { document.body.classList.toggle('mode-classic-bw', mode === 'classic-bw'); document.body.classList.toggle('mode-high-contrast', mode === 'high-contrast'); }
function changeWeight(weight) { document.body.className = document.body.className.replace(/weight-\w+/, `weight-${weight}`); }

renderDrawerList();