// FontAwesome利用可能性をチェックする関数
function checkFontAwesomeAvailability() {
    try {
        // FontAwesome CSSリンクの存在チェック
        const fontAwesomeLink = document.querySelector('link[href*="font-awesome"]');
        if (!fontAwesomeLink) {
            return false;
        }
        
        // テスト要素を作成してFontAwesome適用状況をチェック
        const testElement = document.createElement('i');
        testElement.className = 'fas fa-heart';
        testElement.style.position = 'absolute';
        testElement.style.left = '-9999px';
        testElement.style.visibility = 'hidden';
        document.body.appendChild(testElement);
        
        // FontAwesome特有のスタイルプロパティをチェック
        const computedStyle = window.getComputedStyle(testElement, ':before');
        const fontFamily = computedStyle.getPropertyValue('font-family');
        
        // テスト要素を削除
        document.body.removeChild(testElement);
        
        // FontAwesome固有のフォントファミリーが適用されているかチェック
        return fontFamily && (fontFamily.includes('Font Awesome') || fontFamily.includes('FontAwesome'));
    } catch (error) {
        console.warn('FontAwesome可用性チェックでエラーが発生しました:', error);
        return false;
    }
}

// リトライ機能付きでgenerateCommentsDesignを実行する関数
function retryGenerateComments(maxRetries = 3, retryDelay = 500) {
    let retryCount = 0;
    
    function attemptGeneration() {
        const fontAwesomeAvailable = checkFontAwesomeAvailability();
        
        if (fontAwesomeAvailable || retryCount >= maxRetries) {
            // FontAwesome利用可能または最大リトライ回数に達した場合は実行
            generateCommentsDesign();
            if (!fontAwesomeAvailable && retryCount >= maxRetries) {
                console.log('FontAwesome読み込みに失敗しました。Unicode絵文字で代替表示します。');
            }
            return;
        }
        
        // リトライ
        retryCount++;
        console.log(`FontAwesome読み込み待機中... (${retryCount}/${maxRetries})`);
        setTimeout(attemptGeneration, retryDelay);
    }
    
    attemptGeneration();
}

// Unicode絵文字とFontAwesomeアイコンのマッピングを取得する関数
function getUnicodeIcon(iconClass) {
    const iconMapping = {
        'fas fa-angry': '😠',
        'fas fa-frown': '😕',
        'fas fa-dizzy': '😵',
        'fas fa-meh-blank': '😑',
        'fas fa-meh': '😐',
        'fas fa-tired': '😴',
        'fas fa-grimace': '😬',
        'fas fa-sad-tear': '😢',
        'fas fa-frown-open': '😦'
    };
    
    return iconMapping[iconClass] || '😐'; // デフォルトは無表情
}

// DOMContentLoadedイベントハンドラ
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM読み込み完了');
    
    // Clipboard API対応チェック
    if (!navigator.clipboard) {
        showFeedback('お使いのブラウザはクリップボード機能に対応していません', 'error');
    }
    
    // FontAwesome CSS読み込み状況をチェック
    const fontAwesomeLink = document.querySelector('link[href*="font-awesome"]');
    
    if (fontAwesomeLink && !fontAwesomeLink.hasAttribute('data-loaded')) {
        // FontAwesome CSSが存在するが読み込み完了が不明な場合
        fontAwesomeLink.addEventListener('load', function() {
            console.log('FontAwesome CSS読み込み完了');
            fontAwesomeLink.setAttribute('data-loaded', 'true');
            // 少し遅延させてからcommentsDesignを実行
            setTimeout(() => {
                retryGenerateComments();
            }, 100);
        });
        
        fontAwesomeLink.addEventListener('error', function() {
            console.warn('FontAwesome CSS読み込みに失敗しました');
            fontAwesomeLink.setAttribute('data-loaded', 'false');
            // Unicode代替でcommentsDesignを実行
            generateCommentsDesign();
        });
        
        // CSS読み込み状況が不明な場合は一定時間後にタイムアウト処理
        setTimeout(() => {
            if (!fontAwesomeLink.hasAttribute('data-loaded')) {
                console.log('FontAwesome CSS読み込みタイムアウト、リトライ機能で実行します');
                retryGenerateComments();
            }
        }, 2000);
    } else if (fontAwesomeLink && fontAwesomeLink.hasAttribute('data-loaded')) {
        // 既に読み込み状況が確認済みの場合
        retryGenerateComments();
    } else {
        // FontAwesome CSSが存在しない場合はUnicode代替で実行
        console.log('FontAwesome CSSが見つかりません。Unicode絵文字で実行します');
        generateCommentsDesign();
    }
    
    // その他の初期化処理
    setTimeout(() => {
        addHoverEffects();
    }, 500);
});

// user_info要素のnicknameをリンクに変換する関数
function convertUserInfoNicknames() {
    // 現在のURLからuserIDを抽出
    function extractUserFromURL() {
        const currentURL = window.location.href;
        // URLパターン: https://{root}/logs/{user}/{filename}.html
        // /logs/の後の最初のパス要素を取得
        const match = currentURL.match(/\/logs\/([^\/]+)\//);
        return match ? match[1] : null;
    }

    // class名が"user_info"の全要素を取得
    const userInfoElements = document.querySelectorAll('.user_info');
    
    // 抽出したuserIDを取得
    const userId = extractUserFromURL();
    
    if (!userId) {
        console.warn('URLからuserIDを抽出できませんでした:', window.location.href);
        return;
    }

    // 各user_info要素を処理
    userInfoElements.forEach(element => {
        const text = element.textContent || element.innerText;
        
        // "by {nickname} {datetime}"の形式をチェック
        // datetimeフォーマット: yy/mm/dd HH:MM:SS または yyyy/mm/dd HH:MM:SS
        const byPattern = /^by\s+(.+?)\s+(\d{2,4}\/\d{1,2}\/\d{1,2}\s+\d{1,2}:\d{2}:\d{2})$/;
        const match = text.match(byPattern);
        
        if (match) {
            const nickname = match[1];
            const datetime = match[2];
            
            // 遷移先URLを構築
            const linkURL = `../../index.html#user=${userId}`;
            
            // HTMLを更新（nicknameをリンクに変換）
            element.innerHTML = `by <a href="${linkURL}" target="_blank">${nickname}</a> ${datetime}`;
        }
    });
}

// DOM読み込み完了後に実行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', convertUserInfoNicknames);
} else {
    // すでにDOM読み込みが完了している場合は即座に実行
    convertUserInfoNicknames();
}
