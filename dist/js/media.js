        // グローバル変数
        let currentData = null;
        let currentKeyword = '';
        let isUpdatingFromHash = false;
        
        // ページネーション関連の変数
        let currentPage = 1;
        let itemsPerPage = 9;
        let currentResults = [];
        let isSearchMode = false;

        // 簡易日本語形態素解析器
        class SimpleJapaneseTokenizer {
            constructor() {
                // 一般的な助詞・助動詞・接続詞
                this.particles = [
                    'は', 'が', 'を', 'に', 'で', 'と', 'から', 'まで', 'より', 'へ', 'も', 'の',
                    'こそ', 'でも', 'だけ', 'ばかり', 'など', 'なら', 'って', 'という'
                ];
                
                this.auxiliaries = [
                    'です', 'である', 'だった', 'でした', 'します', 'ます', 'ました', 'でしょう',
                    'かもしれない', 'に違いない', 'はず', 'べき', 'らしい', 'ようだ', 'みたい'
                ];
                
                this.stopWords = [
                    'これ', 'それ', 'あれ', 'どれ', 'この', 'その', 'あの', 'どの',
                    'ここ', 'そこ', 'あそこ', 'どこ', 'こちら', 'そちら', 'あちら', 'どちら',
                    'いつ', 'どう', 'なぜ', 'なに', 'なん', 'だれ', 'どなた'
                ];
            }

            // 文字種判定
            isHiragana(char) {
                return /[\u3041-\u3096]/.test(char);
            }
            
            isKatakana(char) {
                return /[\u30A1-\u30F6]/.test(char);
            }
            
            isKanji(char) {
                return /[\u4E00-\u9FAF]/.test(char);
            }
            
            isAlphanumeric(char) {
                return /[a-zA-Z0-9]/.test(char);
            }

            // 簡易トークン化
            tokenize(text) {
                if (!text) return [];
                
                const tokens = [];
                let currentToken = '';
                let lastCharType = null;
                
                for (let i = 0; i < text.length; i++) {
                    const char = text[i];
                    let charType = null;
                    
                    if (this.isKanji(char)) charType = 'kanji';
                    else if (this.isHiragana(char)) charType = 'hiragana';
                    else if (this.isKatakana(char)) charType = 'katakana';
                    else if (this.isAlphanumeric(char)) charType = 'alphanumeric';
                    else charType = 'other';
                    
                    // 文字種が変わったら分割
                    if (lastCharType && lastCharType !== charType && 
                        !(lastCharType === 'kanji' && charType === 'hiragana')) {
                        if (currentToken.trim()) {
                            tokens.push(currentToken.trim());
                        }
                        currentToken = char;
                    } else {
                        currentToken += char;
                    }
                    
                    lastCharType = charType;
                }
                
                // 最後のトークンを追加
                if (currentToken.trim()) {
                    tokens.push(currentToken.trim());
                }
                
                return this.filterTokens(tokens);
            }

            // トークンのフィルタリング
            filterTokens(tokens) {
                return tokens.filter(token => {
                    // 長さチェック
                    if (token.length < 2) return false;
                    
                    // ストップワードチェック
                    if (this.particles.includes(token) || 
                        this.auxiliaries.includes(token) || 
                        this.stopWords.includes(token)) {
                        return false;
                    }
                    
                    // 数字のみや記号のみを除外
                    if (/^[\d\s\u3000-\u303F\uFF00-\uFFEF]+$/.test(token)) return false;
                    
                    // ひらがなのみで短いものを除外
                    if (token.length <= 2 && this.isAllHiragana(token)) return false;
                    
                    return true;
                });
            }

            isAllHiragana(text) {
                return Array.from(text).every(char => this.isHiragana(char));
            }

            // キーワード抽出
            extractKeywords(text, minLength = 2) {
                const tokens = this.tokenize(text);
                return tokens.map(token => ({
                    surface: token,
                    basic_form: token,
                    pos: '不明',
                    pos_detail_1: '不明',
                    reading: null,
                    pronunciation: null
                }));
            }
        }

        // トークナイザーのインスタンス作成
        const tokenizer = new SimpleJapaneseTokenizer();

        // キーワード抽出関数
        function extractKeywords(text, minLength = 2) {
            return tokenizer.extractKeywords(text, minLength);
        }

        // 重み付きランダムサンプリングでキーワードを選択
        function getWeightedRandomKeyword() {
            const keywordWeights = calculateKeywordWeights();
            const totalWeight = keywordWeights.reduce((sum, item) => sum + item.totalWeight, 0);
            
            let random = Math.random() * totalWeight;
            
            for (const item of keywordWeights) {
                random -= item.totalWeight;
                if (random <= 0) {
                    return item.keyword;
                }
            }
            
            return keywordWeights[0]?.keyword || Object.keys(currentData.keyword_dict)[0];
        }

        // キーワードの総重みを計算（weightが0より多い要素のみ）
        function calculateKeywordWeights() {
            const keywordWeights = [];
            
            Object.keys(currentData.keyword_dict).forEach(keyword => {
                const items = currentData.keyword_dict[keyword];
                const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
                
                // weightが0より多い要素のみを対象とする
                if (totalWeight > 0) {
                    keywordWeights.push({ keyword, totalWeight });
                }
            });
            
            return keywordWeights.sort((a, b) => b.totalWeight - a.totalWeight);
        }

        // タグクラウドを生成（最大10個まで）
        function generateTagCloud() {
            if (!currentData || !currentData.keyword_dict) {
                return;
            }
            
            const tagCloudContainer = document.getElementById('tagCloud');
            const keywordWeights = calculateKeywordWeights();
            
            // 上位10個に制限
            const topKeywords = keywordWeights.slice(0, 9);
            
            if (topKeywords.length === 0) {
                tagCloudContainer.innerHTML = '<p style="color: #666;">キーワードがありません</p>';
                return;
            }
            
            const maxWeight = topKeywords[0].totalWeight;
            const minWeight = topKeywords[topKeywords.length - 1].totalWeight;
            
            tagCloudContainer.innerHTML = topKeywords.map(item => {
                const sizeClass = getTagSizeClass(item.totalWeight, maxWeight, minWeight);
                return `<button class="tag-cloud-item ${sizeClass}" onclick="searchByTagCloud('${item.keyword}')">${item.keyword}</button>`;
            }).join('');
        }

        // タグのサイズクラスを決定
        function getTagSizeClass(weight, maxWeight, minWeight) {
            const ratio = (weight - minWeight) / (maxWeight - minWeight);
            
            if (ratio > 0.8) return 'size-xl';
            if (ratio > 0.6) return 'size-l';
            if (ratio > 0.4) return 'size-m';
            return 'size-s';
        }

        // タグクラウドからの検索（URLハッシュ更新付き）
        function searchByTagCloud(keyword) {
            // ハッシュ更新からの処理中でない場合のみURLハッシュを更新
            if (!isUpdatingFromHash) {
                window.location.hash = `keyword=${encodeURIComponent(keyword)}`;
            }
            
            document.getElementById('searchInput').value = keyword;
            executeKeywordSearch(keyword);
        }

        // 検索実行（URLハッシュ更新付き）
        function performSearch() {
            if (!currentData || !currentData.keyword_dict) {
                alert('データがまだ読み込まれていません。しばらくお待ちください。');
                return;
            }

            const searchInput = document.getElementById('searchInput');
            const keyword = searchInput.value.trim();

            // 既存のperformSearch関数の最初に追加
            if (!keyword) {
                displayRecentPosts();
                return;
            }

            // ハッシュ更新からの処理中でない場合のみURLハッシュを更新
            if (!isUpdatingFromHash) {
                window.location.hash = `keyword=${encodeURIComponent(keyword)}`;
            }

            currentKeyword = keyword;
            showLoading();
            
            setTimeout(() => {
                const results = searchKeyword(keyword);
                currentResults = results;
                isSearchMode = true;
                currentPage = 1;
                displayResultsWithPagination(results, keyword);
                hideLoading();
            }, 500);
        }

        // キーワード検索
        function searchKeyword(keyword) {
            const results = [];
            
            // 検索キーワードを解析
            const searchKeywords = extractKeywords(keyword);
            console.log('検索キーワード:', keyword);
            console.log('解析結果:', searchKeywords);
            
            // 検索語を収集
            const searchTerms = new Set();
            searchKeywords.forEach(kw => {
                if (kw.surface) searchTerms.add(kw.surface);
            });
            searchTerms.add(keyword);
            
            const filteredSearchTerms = Array.from(searchTerms).filter(term => 
                term && term.length > 1
            );
            
            console.log('検索語:', filteredSearchTerms);
            
            // 1. キーワード辞書での検索
            Object.keys(currentData.keyword_dict).forEach(dictKeyword => {
                const dictKeywords = extractKeywords(dictKeyword);
                const dictTerms = new Set();
                dictKeywords.forEach(kw => {
                    if (kw.surface) dictTerms.add(kw.surface);
                });
                dictTerms.add(dictKeyword);
                
                const hasMatch = filteredSearchTerms.some(searchTerm =>
                    Array.from(dictTerms).some(dictTerm =>
                        searchTerm === dictTerm ||
                        dictTerm.includes(searchTerm) ||
                        searchTerm.includes(dictTerm)
                    )
                );
                
                if (hasMatch) {
                    results.push(...currentData.keyword_dict[dictKeyword]);
                    console.log(`マッチしたキーワード: ${dictKeyword}`);
                }
            });

            // 2. ページタイトルでの検索
            if (currentData.page_title_dict) {
                Object.keys(currentData.page_title_dict).forEach(filePath => {
                    const title = currentData.page_title_dict[filePath];
                    if (!title) return;
                    const titleKeywords = extractKeywords(title);
                    const titleTerms = new Set();
                    titleKeywords.forEach(kw => {
                        if (kw.surface) titleTerms.add(kw.surface);
                    });
                    titleTerms.add(title);
                    
                    const hasTitleMatch = filteredSearchTerms.some(searchTerm =>
                        Array.from(titleTerms).some(titleTerm =>
                            searchTerm === titleTerm ||
                            titleTerm.includes(searchTerm) ||
                            searchTerm.includes(titleTerm)
                        )
                    );
                    
                    if (hasTitleMatch) {
                        let maxWeight = 0;
                        Object.keys(currentData.keyword_dict).forEach(dictKeyword => {
                            const items = currentData.keyword_dict[dictKeyword];
                            const item = items.find(item => item.file_path === filePath);
                            if (item && item.weight > maxWeight) {
                                maxWeight = item.weight;
                            }
                        });
                        
                        if (maxWeight > 0) {
                            results.push({ file_path: filePath, weight: maxWeight });
                            console.log(`タイトルマッチ: ${title}`);
                        }
                    }
                });
            }

            // 重複除去とweight順ソート
            const uniqueResults = [];
            const seenPaths = new Set();
            
            results.forEach(result => {
                if (!seenPaths.has(result.file_path)) {
                    seenPaths.add(result.file_path);
                    uniqueResults.push(result);
                }
            });

            return uniqueResults.sort((a, b) => b.weight - a.weight);
        }

        // ページネーション付きで検索結果を表示
        function displayResultsWithPagination(results, keyword) {
            const resultsGrid = document.getElementById('resultsGrid');
            const resultsCount = document.getElementById('resultsCount');
            const noResults = document.getElementById('noResults');
            const resultsInfoH2 = document.querySelector('#resultsInfo h2');
            
            // h2のテキストを検索結果に戻す
            if (resultsInfoH2) {
                resultsInfoH2.textContent = '検索結果';
            }
            
            resultsCount.textContent = `"${keyword}" の検索結果: ${results.length}件`;
            
            if (results.length === 0) {
                resultsGrid.innerHTML = '';
                noResults.style.display = 'block';
                hidePagination();
                return;
            }

            noResults.style.display = 'none';
            
            // ページネーション用のデータ計算
            const totalPages = Math.ceil(results.length / itemsPerPage);
            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const currentPageResults = results.slice(startIndex, endIndex);
            
            resultsGrid.innerHTML = currentPageResults.map(result => {
                const title = currentData.page_title_dict[result.file_path] || "無題";
                const topKeywords = getTopKeywordsForPath(result.file_path);
                const authorInfo = getAuthorInfo(result.file_path);
                
                return `
                    <a href="${result.file_path}" class="result-card">
                        <div class="result-title">${title}</div>
                        ${authorInfo ? `<div style="color: #666; font-size: 0.9rem; margin-bottom: 0.5rem;">${authorInfo}</div>` : ''}
                        <div class="result-keywords">
                            ${topKeywords.map(kw => `<span class="keyword-tag" onclick="searchByKeywordTag(event, '${kw}')">${kw}</span>`).join('')}
                        </div>
                    </a>
                `;
            }).join('');
            
            // ページネーションコントロールを表示
            if (totalPages > 1) {
                showPagination(currentPage, totalPages, results.length);
            } else {
                hidePagination();
            }
        }

        // 最新投稿順でページを取得する関数
        function getRecentPages() {
            if (!currentData || !currentData.sort_dict) {
                return [];
            }
            
            // sort_dictからタイムスタンプ順でソート
            const sortedPages = Object.keys(currentData.sort_dict)
                .map(filePath => ({
                    file_path: filePath,
                    publish_timestamp: currentData.sort_dict[filePath].publish_timestamp,
                    publish_datetime: currentData.sort_dict[filePath].publish_datetime
                }))
                .sort((a, b) => b.publish_timestamp - a.publish_timestamp); // 降順（最新順）
            
            return sortedPages;
        }

        // ニックネームと投稿日時情報を取得する共通関数
        function getAuthorInfo(filePath) {
            let authorInfo = '';
            
            if (currentData.nickname_dict && currentData.nickname_dict[filePath]) {
                const nickname = currentData.nickname_dict[filePath].nickname || '匿名';
                
                // sort_dictから投稿日時を取得
                let publishDate = '';
                if (currentData.sort_dict && currentData.sort_dict[filePath] && currentData.sort_dict[filePath].publish_datetime) {
                    publishDate = new Date(currentData.sort_dict[filePath].publish_datetime).toLocaleDateString('ja-JP', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                }
                
                if (publishDate) {
                    authorInfo = `by ${nickname} ${publishDate}`;
                } else {
                    authorInfo = `by ${nickname}`;
                }
            } else if (currentData.sort_dict && currentData.sort_dict[filePath] && currentData.sort_dict[filePath].publish_datetime) {
                // ニックネーム情報がない場合は投稿日時のみ
                const publishDate = new Date(currentData.sort_dict[filePath].publish_datetime).toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                authorInfo = publishDate;
            }
            
            return authorInfo;
        }

        // ページネーション付きで最新投稿順の結果を表示する関数
        function displayRecentPosts() {
            if (!currentData) {
                return;
            }
            
            const recentPages = getRecentPages();
            currentResults = recentPages;
            isSearchMode = false;
            currentPage = 1;
            
            const resultsGrid = document.getElementById('resultsGrid');
            const resultsCount = document.getElementById('resultsCount');
            const noResults = document.getElementById('noResults');
            const resultsInfoH2 = document.querySelector('#resultsInfo h2');
            
            // h2のテキストを変更
            if (resultsInfoH2) {
                resultsInfoH2.textContent = '最近の分析事例';
            }
            
            resultsCount.textContent = `最新の投稿: ${recentPages.length}件`;
            
            if (recentPages.length === 0) {
                resultsGrid.innerHTML = '';
                noResults.style.display = 'block';
                hidePagination();
                return;
            }

            noResults.style.display = 'none';
            
            // ページネーション用のデータ計算
            const totalPages = Math.ceil(recentPages.length / itemsPerPage);
            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const currentPageResults = recentPages.slice(startIndex, endIndex);
            
            resultsGrid.innerHTML = currentPageResults.map(page => {
                const title = currentData.page_title_dict[page.file_path] || "無題";
                const topKeywords = getTopKeywordsForPath(page.file_path);
                const authorInfo = getAuthorInfo(page.file_path);
                
                return `
                    <a href="${page.file_path}" class="result-card">
                        <div class="result-title">${title}</div>
                        ${authorInfo ? `<div style="color: #666; font-size: 0.9rem; margin-bottom: 0.5rem;">${authorInfo}</div>` : ''}
                        <div class="result-keywords">
                            ${topKeywords.map(kw => `<span class="keyword-tag" onclick="searchByKeywordTag(event, '${kw}')">${kw}</span>`).join('')}
                        </div>
                    </a>
                `;
            }).join('');
            
            // ページネーションコントロールを表示
            if (totalPages > 1) {
                showPagination(currentPage, totalPages, recentPages.length);
            } else {
                hidePagination();
            }
        }

        // ページネーションコントロールを表示
        function showPagination(currentPageNum, totalPages, totalItems) {
            const paginationControls = document.getElementById('paginationControls');
            const prevBtn = document.getElementById('prevPageBtn');
            const nextBtn = document.getElementById('nextPageBtn');
            const paginationInfo = document.getElementById('paginationInfo');
            
            paginationControls.style.display = 'flex';
            
            // ボタンの有効/無効を設定
            prevBtn.disabled = currentPageNum === 1;
            nextBtn.disabled = currentPageNum === totalPages;
            
            // ページ情報を更新
            const startItem = (currentPageNum - 1) * itemsPerPage + 1;
            const endItem = Math.min(currentPageNum * itemsPerPage, totalItems);
            paginationInfo.textContent = `${startItem}-${endItem}件 / 全${totalItems}件 (${currentPageNum}/${totalPages}ページ)`;
        }

        // ページネーションコントロールを非表示
        function hidePagination() {
            const paginationControls = document.getElementById('paginationControls');
            paginationControls.style.display = 'none';
        }

        // 次のページへ
        function goToNextPage() {
            const totalPages = Math.ceil(currentResults.length / itemsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                if (isSearchMode) {
                    displayResultsWithPagination(currentResults, currentKeyword);
                } else {
                    displayRecentPosts();
                }
                scrollToResults();
            }
        }

        // 前のページへ
        function goToPreviousPage() {
            if (currentPage > 1) {
                currentPage--;
                if (isSearchMode) {
                    displayResultsWithPagination(currentResults, currentKeyword);
                } else {
                    displayRecentPosts();
                }
                scrollToResults();
            }
        }

        // file_pathに紐づく上位5つのキーワードを取得
        function getTopKeywordsForPath(filePath) {
            if (!currentData || !currentData.keyword_dict) {
                return [];
            }
            
            const keywords = [];
            Object.keys(currentData.keyword_dict).forEach(keyword => {
                const items = currentData.keyword_dict[keyword];
                const item = items.find(item => item.file_path === filePath);
                if (item) {
                    keywords.push({ keyword: keyword, weight: item.weight });
                }
            });
            
            return keywords
                .sort((a, b) => b.weight - a.weight)
                .slice(0, 5)
                .map(item => item.keyword);
        }

        // ローディング表示
        function showLoading() {
            document.getElementById('loadingIndicator').style.display = 'block';
            document.getElementById('resultsGrid').style.display = 'none';
            document.getElementById('noResults').style.display = 'none';
            hidePagination();
        }

        // ローディング非表示
        function hideLoading() {
            document.getElementById('loadingIndicator').style.display = 'none';
            document.getElementById('resultsGrid').style.display = 'grid';
        }

        // Enterキーで検索
        document.getElementById('searchInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });

        // キーワードタグクリック時の処理（URLハッシュ更新付き）
        function searchByKeywordTag(event, keyword) {
            event.preventDefault();
            event.stopPropagation();
            
            // ハッシュ更新からの処理中でない場合のみURLハッシュを更新
            if (!isUpdatingFromHash) {
                window.location.hash = `keyword=${encodeURIComponent(keyword)}`;
            }
            
            setSearchKeyword(keyword);
            executeKeywordSearch(keyword);
        }

        // 検索フォームにキーワードを設定する関数
        function setSearchKeyword(keyword) {
            const searchInput = document.getElementById('searchInput');
            searchInput.value = keyword;
            searchInput.focus();
            searchInput.select();
        }

        // キーワード検索を実行する関数（URLハッシュ更新付き）
        function executeKeywordSearch(keyword) {
            if (!currentData || !currentData.keyword_dict) {
                alert('データがまだ読み込まれていません。しばらくお待ちください。');
                return;
            }

            // ハッシュ更新からの処理中は重複更新を避ける
            if (!isUpdatingFromHash) {
                // URLハッシュが現在のキーワードと異なる場合のみ更新
                const currentHash = window.location.hash;
                const expectedHash = `#keyword=${encodeURIComponent(keyword)}`;
                if (currentHash !== expectedHash) {
                    window.location.hash = `keyword=${encodeURIComponent(keyword)}`;
                }
            }

            currentKeyword = keyword;
            showLoading();
            
            setTimeout(() => {
                const results = searchKeyword(keyword);
                currentResults = results;
                isSearchMode = true;
                currentPage = 1;
                displayResultsWithPagination(results, keyword);
                hideLoading();
                scrollToResults();
            }, 300);
        }

        // 検索結果セクションへのスムーズスクロール関数
        function scrollToResults() {
            const resultsSection = document.getElementById('resultsInfo');
            if (resultsSection) {
                resultsSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }

        // キーワードデータを読み込む関数
        async function loadKeywordData() {
            const response = await fetch('data/keyword_weight.json');
            const data = await response.json();
            currentData = data;
            console.log('キーワードデータを読み込みました');
            
            generateTagCloud();
            updateResultsCount();
        }

        // 結果カウント表示を更新
        function updateResultsCount() {
            const resultsCount = document.getElementById('resultsCount');
            if (currentData && currentData.keyword_dict) {
                const totalItems = Object.values(currentData.keyword_dict).reduce((sum, items) => sum + items.length, 0);
                const uniquePaths = new Set();
                Object.values(currentData.keyword_dict).forEach(items => {
                    items.forEach(item => uniquePaths.add(item.file_path));
                });
                
                resultsCount.textContent = `データ準備完了 - ${Object.keys(currentData.keyword_dict).length}キーワード、${uniquePaths.size}ドキュメント (簡易検索モード)`;
            }
        }

        // アプリケーション初期化
        async function initializeApp() {
            console.log('アプリケーションを初期化中...');
            
            // ステータス更新
            const statusSection = document.getElementById('statusSection');
            statusSection.style.display = 'block';
            
            // データを読み込み
            await loadKeywordData();
            
            // 初期化完了後、ステータスを3秒後に非表示
            setTimeout(() => {
                statusSection.style.display = 'none';
            }, 500);
            
            console.log('初期化完了');
        }

        // ページ読み込み時に初期化
        document.addEventListener('DOMContentLoaded', () => {
            initializeApp();
        });

        // グローバルエラーハンドラ
        window.addEventListener('error', (event) => {
            console.error('アプリケーションエラー:', event.error);
        });

        // URLハッシュ値からキーワードを抽出して検索する機能
        function handleHashKeyword() {
            if (isUpdatingFromHash) return; // 無限ループ防止
            
            const hash = window.location.hash;
            
            // #keyword=で始まるハッシュをチェック
            if (hash.startsWith('#keyword=')) {
                let keyword = hash.substring(9); // '#keyword='の9文字を除去
                
                // ?や&以降のパラメータを除去
                const parameterIndex = Math.min(
                    keyword.indexOf('?') !== -1 ? keyword.indexOf('?') : keyword.length,
                    keyword.indexOf('&') !== -1 ? keyword.indexOf('&') : keyword.length
                );
                keyword = keyword.substring(0, parameterIndex);
                
                // URLデコード
                keyword = decodeURIComponent(keyword);
                
                if (keyword && keyword.trim()) {
                    const trimmedKeyword = keyword.trim();
                    console.log('URLハッシュからキーワードを検出:', trimmedKeyword);
                    
                    // フラグを設定してハッシュ更新による処理であることを示す
                    isUpdatingFromHash = true;
                    
                    // 入力フォームにキーワードを設定
                    const searchInput = document.getElementById('searchInput');
                    if (searchInput) {
                        searchInput.value = trimmedKeyword;
                        
                        // 視覚的フィードバック
                        searchInput.focus();
                        searchInput.select();
                    }
                    
                    // データが読み込まれている場合は即座に検索実行
                    if (currentData && currentData.keyword_dict) {
                        executeKeywordSearchFromHash(trimmedKeyword);
                    } else {
                        // データ読み込み完了まで待機してから検索実行
                        const checkDataInterval = setInterval(() => {
                            if (currentData && currentData.keyword_dict) {
                                clearInterval(checkDataInterval);
                                executeKeywordSearchFromHash(trimmedKeyword);
                            }
                        }, 100);
                        
                        // 10秒でタイムアウト
                        setTimeout(() => {
                            clearInterval(checkDataInterval);
                            isUpdatingFromHash = false;
                        }, 10000);
                    }
                }
            }
        }

        // ハッシュからの検索実行（ハッシュ更新なし）
        function executeKeywordSearchFromHash(keyword) {
            if (!currentData || !currentData.keyword_dict) {
                isUpdatingFromHash = false;
                return;
            }

            currentKeyword = keyword;
            showLoading();
            
            setTimeout(() => {
                const results = searchKeyword(keyword);
                currentResults = results;
                isSearchMode = true;
                currentPage = 1;
                displayResultsWithPagination(results, keyword);
                hideLoading();
                scrollToResults();
                isUpdatingFromHash = false; // 処理完了後にフラグをリセット
            }, 300);
        }

        // ページ読み込み時とハッシュ変更時にハッシュキーワードをチェック
        window.addEventListener('load', handleHashKeyword);
        window.addEventListener('hashchange', handleHashKeyword);
        
        // 初期化完了後の遅延チェック用
        let hashCheckTimeout = null;
        
        function scheduleHashCheck() {
            if (hashCheckTimeout) {
                clearTimeout(hashCheckTimeout);
            }
            hashCheckTimeout = setTimeout(() => {
                if (!isUpdatingFromHash) {
                    handleHashKeyword();
                }
            }, 500);
        }

        // DOMContentLoaded時の処理（重複登録を避ける）
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', scheduleHashCheck);
        } else {
            scheduleHashCheck();
        }

        // アプリケーション初期化時に最新投稿を表示する関数
        function displayInitialContent() {
            if (currentData && currentData.sort_dict) {
                displayRecentPosts();
            }
        }

        // 既存のinitializeApp関数の後に実行される初期化処理
        function enhancedInitialization() {
            // データ読み込み完了をチェック
            const checkDataAndDisplay = setInterval(() => {
                if (currentData && currentData.sort_dict && currentData.page_title_dict) {
                    clearInterval(checkDataAndDisplay);
                    
                    // URLハッシュにキーワードがない場合は最新投稿を表示
                    const hash = window.location.hash;
                    if (!hash.startsWith('#keyword=')) {
                        setTimeout(displayInitialContent, 500);
                    }
                }
            }, 100);
            
            // 10秒でタイムアウト
            setTimeout(() => {
                clearInterval(checkDataAndDisplay);
            }, 10000);
        }

        // 既存のHTML onclickを置き換えるためのグローバル関数
        window.performSearch = performSearch;

        // 拡張初期化を実行
        enhancedInitialization();
