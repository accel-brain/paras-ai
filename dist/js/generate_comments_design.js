

function generateCommentsDesign() {
    // FontAwesome利用可能性をチェック
    const fontAwesomeAvailable = checkFontAwesomeAvailability();
    
    // <h1>想定される反対意見</h1>を検索し、未処理のもののみを対象とする
    const headings = document.querySelectorAll('h1');
    const targetUls = [];
    
    for (let heading of headings) {
        if (heading.textContent.trim() === '想定される反対意見') {
            // 次のul要素を検索
            let nextElement = heading.nextElementSibling;
            while (nextElement) {
                if (nextElement.tagName === 'UL') {
                    // 既に処理済みかチェック
                    if (!nextElement.classList.contains('opposition-comments-processed')) {
                        targetUls.push(nextElement);
                    }
                    break;
                }
                nextElement = nextElement.nextElementSibling;
            }
        }
    }
    
    if (targetUls.length === 0) {
        console.log('新規で対象となるul要素が見つかりません（既に処理済みの可能性があります）');
        return;
    }
    
    // Unicode絵文字の代替配列（FontAwesome使用不可時）
    const unicodeIcons = ['😠', '😕', '😐', '😑', '😒', '😔', '😖', '😞', '😤', '😟'];
    
    // FontAwesome使用時のアイコンクラス配列
    const negativeIconClasses = [
        'fas fa-angry',      // 怒った顔
        'fas fa-frown',      // しかめっ面
        'fas fa-dizzy',      // めまい/困惑した顔
        'fas fa-meh-blank',  // 無表情
        'fas fa-meh',        // 普通の顔（批判的文脈）
        'fas fa-tired',      // 疲れた顔
        'fas fa-grimace',    // しかめ顔
        'fas fa-sad-tear',   // 悲しい涙
        'fas fa-frown-open', // 口を開けてしかめっ面
        'fas fa-angry'       // 追加の怒り顔
    ];
    
    // ネガティブな感情を表す色の配列
    const negativeColors = [
        '#e74c3c', '#c0392b', '#e67e22', '#d35400', '#f39c12',
        '#8e44ad', '#9b59b6', '#34495e', '#2c3e50', '#7f8c8d',
        '#ad4e00', '#a93226', '#6c3483', '#2874a6', '#138d75'
    ];
    
    // Font Awesomeのスタイルシートを確認・追加（FontAwesome使用時のみ）
    if (fontAwesomeAvailable && !document.querySelector('link[href*="font-awesome"]')) {
        const fontAwesomeLink = document.createElement('link');
        fontAwesomeLink.rel = 'stylesheet';
        fontAwesomeLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
        document.head.appendChild(fontAwesomeLink);
        
        fontAwesomeLink.onload = function() {
            applyStylesToElements();
        };
    } else {
        applyStylesToElements();
    }
    
    function applyStylesToElements() {
        // 対象のul要素すべてにユニークなIDを追加し、スタイルを適用
        const styleRules = [];
        
        targetUls.forEach((targetUl, index) => {
            const uniqueId = 'opposition-ul-' + Date.now() + '-' + index;
            targetUl.id = uniqueId;
            
            // 処理済みのマークを追加
            targetUl.classList.add('opposition-comments-processed');
            
            // 各ul要素用のスタイル定義を追加
            styleRules.push(`
                #${uniqueId} {
                    background-color: #f8f9fa;
                    border: 1px solid #e1e5e9;
                    border-radius: 8px;
                    padding: 16px;
                    margin: 16px 0;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    list-style: none;
                }
                
                #${uniqueId} li {
                    background-color: #ffffff;
                    border: 1px solid #e1e5e9;
                    border-radius: 6px;
                    margin-bottom: 12px;
                    padding: 16px 16px 16px 56px;
                    position: relative;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                    line-height: 1.6;
                    font-size: 14px;
                    color: #333;
                    list-style: none;
                    display: flex;
                    align-items: center;
                }
                
                #${uniqueId} li:last-child {
                    margin-bottom: 0;
                }
                
                #${uniqueId} li .comment-icon {
                    position: absolute;
                    left: 16px;
                    top: 50%;
                    transform: translateY(-50%);
                    font-size: 18px;
                    background-color: #ffffff;
                    border-radius: 50%;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                    border: 2px solid #e1e5e9;
                    transition: transform 0.2s ease;
                }
                
                #${uniqueId} li:hover {
                    background-color: #f8f9fa;
                    border-color: #d1d5db;
                }
                
                #${uniqueId} li:hover .comment-icon {
                    transform: translateY(-50%) scale(1.1);
                }
                
                #${uniqueId} li .comment-text {
                    flex: 1;
                    margin-left: 0;
                }
            `);
        });
        
        // ヤフーニュースコメント風のスタイルを追加
        const style = document.createElement('style');
        style.textContent = styleRules.join('\n');
        document.head.appendChild(style);
        
        // 各ul要素の各li要素を処理
        let totalProcessed = 0;
        targetUls.forEach(targetUl => {
            const listItems = targetUl.querySelectorAll('li');
            listItems.forEach((li, index) => {
                // 既に処理済みかチェック
                if (li.classList.contains('opposition-li-processed')) {
                    return; // 処理済みの場合はスキップ
                }
                
                // ランダムに選択
                let randomIcon, randomColor;
                if (fontAwesomeAvailable) {
                    randomIcon = negativeIconClasses[Math.floor(Math.random() * negativeIconClasses.length)];
                } else {
                    randomIcon = unicodeIcons[Math.floor(Math.random() * unicodeIcons.length)];
                }
                randomColor = negativeColors[Math.floor(Math.random() * negativeColors.length)];
                
                // 元のテキストコンテンツを保存
                const originalText = li.textContent || li.innerText;
                
                // li要素の内容をクリアして再構築
                li.innerHTML = '';
                
                // アイコン要素を作成
                let iconElement;
                if (fontAwesomeAvailable) {
                    iconElement = document.createElement('i');
                    iconElement.className = `${randomIcon} comment-icon`;
                } else {
                    iconElement = document.createElement('span');
                    iconElement.className = 'comment-icon unicode-icon';
                    iconElement.textContent = randomIcon;
                }
                iconElement.style.color = randomColor;
                
                // テキスト要素を作成
                const textElement = document.createElement('span');
                textElement.className = 'comment-text';
                textElement.textContent = originalText;
                
                // コピー機能が既に設定されている場合は保持
                const existingCopyIcon = li.querySelector('.copy-icon');
                if (existingCopyIcon) {
                    // 既存のコピー機能を保持
                    const copyIcon = existingCopyIcon.cloneNode(true);
                    textElement.appendChild(copyIcon);
                }
                
                // li要素に新しい構造を追加
                li.appendChild(iconElement);
                li.appendChild(textElement);
                
                // 処理済みのマークを追加
                li.classList.add('opposition-li-processed');
                
                // アニメーション効果を追加
                setTimeout(() => {
                    iconElement.style.opacity = '0';
                    iconElement.style.transform = fontAwesomeAvailable ? 
                        'translateY(-50%) scale(0.5)' : 'translateY(-50%) scale(0.5)';
                    
                    setTimeout(() => {
                        iconElement.style.transition = 'all 0.3s ease';
                        iconElement.style.opacity = '1';
                        iconElement.style.transform = 'translateY(-50%) scale(1)';
                    }, 50);
                }, index * 100); // 順次表示効果
                
                totalProcessed++;
            });
        });
        
        console.log(`${targetUls.length}個の新規「想定される反対意見」セクションで、合計${totalProcessed}個の反対意見をスタイリングしました（${fontAwesomeAvailable ? 'FontAwesome' : 'Unicode絵文字'}使用）`);
    }
}

// コピー機能との連携を強化する関数
function enhanceCopyFunctionality() {
    // 既存のコピー機能がある場合、新しい構造に対応させる
    const copyItems = document.querySelectorAll('.opposition-comments-processed li');
    
    copyItems.forEach(item => {
        const textSpan = item.querySelector('.comment-text');
        const copyIcon = item.querySelector('.copy-icon');
        
        if (textSpan && copyIcon && !item.hasAttribute('data-copy-enhanced')) {
            // コピー機能を新しい構造に適応
            item.addEventListener('click', function(e) {
                if (e.target.classList.contains('copy-icon')) {
                    const textContent = textSpan.textContent.replace(/📋/g, '').trim();
                    copyListItem(e.target, textContent);
                }
            });
            
            item.setAttribute('data-copy-enhanced', 'true');
        }
    });
}

// アイコンの色を動的に変更する関数（ホバー効果強化）
function addHoverEffects() {
    const commentIcons = document.querySelectorAll('.comment-icon');
    
    commentIcons.forEach(icon => {
        const originalColor = icon.style.color;
        const isUnicodeIcon = icon.classList.contains('unicode-icon');
        
        icon.addEventListener('mouseenter', function() {
            if (isUnicodeIcon) {
                // Unicode絵文字の場合は背景色と拡大効果のみ
                this.style.backgroundColor = 'rgba(76, 175, 80, 0.2)';
                this.style.transform = 'translateY(-50%) scale(1.2)';
            } else {
                // FontAwesome使用時の色変更処理
                const rgb = hexToRgb(originalColor);
                if (rgb) {
                    const lighterColor = `rgb(${Math.min(255, rgb.r + 30)}, ${Math.min(255, rgb.g + 30)}, ${Math.min(255, rgb.b + 30)})`;
                    this.style.color = lighterColor;
                }
            }
        });
        
        icon.addEventListener('mouseleave', function() {
            if (isUnicodeIcon) {
                // Unicode絵文字の場合は元の状態に戻す
                this.style.backgroundColor = '#ffffff';
                this.style.transform = 'translateY(-50%) scale(1)';
            } else {
                // FontAwesome使用時は元の色に戻す
                this.style.color = originalColor;
            }
        });
    });
}

// 16進数カラーをRGBに変換するヘルパー関数（既存のまま）
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

// メイン実行
generateCommentsDesign();
