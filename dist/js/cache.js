document.addEventListener('DOMContentLoaded', function() {
    /**
     * 現在時刻を10分単位で切り下げたタイムスタンプを生成
     * @returns {number} 10分単位で切り下げたタイムスタンプ
     */
    function generateCacheValue() {
        const now = new Date();
        const minutes = now.getMinutes();
        const roundedMinutes = Math.floor(minutes / 10) * 10;
        
        const roundedTime = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            now.getHours(),
            roundedMinutes,
            0,
            0
        );
        
        return roundedTime.getTime();
    }

    /**
     * URLにキャッシュクエリ文字列を付加または更新
     * @param {string} url 元のURL
     * @param {number} cacheValue キャッシュ値
     * @returns {string} 更新されたURL
     */
    function addOrUpdateCacheQuery(url, cacheValue) {
        // 既存のcacheパラメータを削除
        const urlObj = new URL(url, window.location.origin);
        urlObj.searchParams.delete('cache');
        
        // 新しいcacheパラメータを追加
        urlObj.searchParams.set('cache', cacheValue);
        
        return urlObj.toString();
    }

    /**
     * CSSファイルのキャッシュクエリを更新
     */
    function updateCssCache() {
        const cacheValue = generateCacheValue();
        const linkTags = document.querySelectorAll('link[rel="stylesheet"][href]');
        
        linkTags.forEach(link => {
            const originalHref = link.getAttribute('href');
            // 相対パスや絶対パスに対応
            if (originalHref && !originalHref.startsWith('data:')) {
                const newHref = addOrUpdateCacheQuery(originalHref, cacheValue);
                link.setAttribute('href', newHref);
            }
        });
    }

    /**
     * JavaScriptファイルのキャッシュクエリを更新
     */
    function updateJsCache() {
        const cacheValue = generateCacheValue();
        const scriptTags = document.querySelectorAll('script[src]');
        
        scriptTags.forEach(script => {
            const originalSrc = script.getAttribute('src');
            // 相対パスや絶対パスに対応、data:やblob:は除外
            if (originalSrc && !originalSrc.startsWith('data:') && !originalSrc.startsWith('blob:')) {
                const newSrc = addOrUpdateCacheQuery(originalSrc, cacheValue);
                script.setAttribute('src', newSrc);
            }
        });
    }

    /**
     * キャッシュクエリを更新する処理を実行
     */
    function updateCacheQueries() {
        updateCssCache();
        updateJsCache();
        console.log('Cache queries updated at:', new Date().toLocaleString());
    }

    // 初回実行
    updateCacheQueries();

    // 10分ごとに自動実行（600,000ミリ秒 = 10分）
    setInterval(updateCacheQueries, 600000);
});
