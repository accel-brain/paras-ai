async function copyListItem(iconElement) {
    try {
        const listItem = iconElement.parentElement;
        const textSpan = listItem.querySelector('.list-item-text');
        var text = textSpan ? textSpan.textContent.trim() : '';
        if (!text) {
            showFeedback('コピーするテキストが見つかりません', 'error');
            return;
        }
        text = text + " #paras_ai";
        await navigator.clipboard.writeText(text);
        showFeedback('リスト項目をコピーしました！');
        
const originalIcon = iconElement.innerHTML;
const originalWidth = iconElement.offsetWidth; // 元の幅を保存

iconElement.style.color = '#4CAF50';
iconElement.style.background = 'rgba(76, 175, 80, 0.1)';
iconElement.style.width = originalWidth + 'px'; // 幅を固定
iconElement.style.display = 'inline-block'; // インラインブロックにして幅を適用
iconElement.innerHTML = '✅';

setTimeout(() => {
    iconElement.style.color = '';
    iconElement.style.background = 'rgba(102, 126, 234, 0.1)';
    iconElement.style.width = ''; // 幅をリセット
    iconElement.innerHTML = originalIcon;
}, 2500);
        
    } catch (err) {
        console.error('コピーに失敗しました: ', err);
        showFeedback('コピーに失敗しました', 'error');
    }
}
