// Firebase初期化（事前実行）
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getFirestore, collection, getDocs, query, where, orderBy, limit } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyDpiNeyrFVTuvIWIo7ZgpmdEZSytGfEzMY",
  authDomain: "paras-api-service.firebaseapp.com",
  projectId: "paras-api-service",
  storageBucket: "paras-api-service.firebasestorage.app",
  messagingSenderId: "298398863456",
  appId: "1:298398863456:web:08f31fa500a9e137f17305",
  measurementId: "G-0MVTPPPY5N"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ===========================================
// Firestoreアクセス関数（async必須）
// ===========================================

// Firestore から keyword タイプのドキュメントを取得して処理
async function getKeywordWeights() {
    try {
        const keywordWeights = [];
        
        // keyword タイプのドキュメントを全て取得
        const q = query(
            collection(db, 'public_html'),
            where('type', '==', 'keyword')
        );
        
        const snapshot = await getDocs(q);
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const keyword = data.keyword;
            const items = data.files || [];
            
            // 総重みを計算
            const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
            
            // weightが0より多い要素のみを対象とする
            if (totalWeight > 0) {
                keywordWeights.push({ keyword, totalWeight });
            }
        });
        
        return keywordWeights;
        
    } catch (error) {
        console.error('キーワード重み取得エラー:', error);
        return [];
    }
}

async function searchKeywordsHybrid(filteredSearchTerms) {
    try {
        const results = [];
        
        // Step 1: 完全一致で高速取得
        const exactMatches = filteredSearchTerms.map(searchTerm => 
            getDocs(query(
                collection(db, 'public_html'),
                where('type', '==', 'keyword'),
                where('keyword', '==', searchTerm)
            ))
        );
        
        const exactSnapshots = await Promise.all(exactMatches);
        const foundKeywords = new Set();
        
        exactSnapshots.forEach(snapshot => {
            snapshot.forEach(doc => {
                const data = doc.data();
                results.push(...(data.files || []));
                foundKeywords.add(data.keyword);
                console.log(`完全一致: ${data.keyword}`);
            });
        });
        
        // Step 2: 完全一致しなかった検索語のみ部分一致検索
        const remainingTerms = filteredSearchTerms.filter(term => !foundKeywords.has(term));
        
        if (remainingTerms.length > 0) {
            // 部分一致は全keyword取得が必要
            const q = query(
                collection(db, 'public_html'),
                where('type', '==', 'keyword')
            );
            
            const snapshot = await getDocs(q);
            
            snapshot.forEach(doc => {
                const data = doc.data();
                const dictKeyword = data.keyword;
                
                // 既に完全一致で処理済みはスキップ
                if (foundKeywords.has(dictKeyword)) return;
                
                const dictKeywords = extractKeywords(dictKeyword);
                const dictTerms = new Set();
                dictKeywords.forEach(kw => {
                    if (kw.surface) dictTerms.add(kw.surface);
                });
                dictTerms.add(dictKeyword);
                
                const hasMatch = remainingTerms.some(searchTerm =>
                    Array.from(dictTerms).some(dictTerm =>
                        dictTerm.includes(searchTerm) ||
                        searchTerm.includes(dictTerm)
                    )
                );
                
                if (hasMatch) {
                    results.push(...(data.files || []));
                    console.log(`部分一致: ${dictKeyword}`);
                }
            });
        }
        
        return results;
        
    } catch (error) {
        console.error('キーワード検索エラー:', error);
        return [];
    }
}

async function searchPageTitles(filteredSearchTerms) {
    try {
        const results = [];
        
        // Step 1: 完全一致でタイトル検索（並列処理）
        const exactMatches = filteredSearchTerms.map(searchTerm => 
            getDocs(query(
                collection(db, 'public_html'),
                where('type', '==', 'page_title'),
                where('title', '==', searchTerm)
            ))
        );
        
        const exactSnapshots = await Promise.all(exactMatches);
        const foundTitles = new Set();
        
        // 完全一致したタイトルを処理
        for (const snapshot of exactSnapshots) {
            for (const doc of snapshot.docs) {
                const data = doc.data();
                const filePath = data.file_path;
                const title = data.title;
                
                if (!title) continue;
                
                foundTitles.add(title);
                
                // 該当ファイルの最大重みを取得
                const maxWeight = await getMaxWeightForFile(filePath);
                
                if (maxWeight > 0) {
                    results.push({ file_path: filePath, weight: maxWeight });
                    console.log(`タイトル完全一致: ${title}`);
                }
            }
        }
        
        // Step 2: 部分一致検索（完全一致しなかった検索語のみ）
        const remainingTerms = filteredSearchTerms.filter(term => !foundTitles.has(term));
        
        if (remainingTerms.length > 0) {
            // page_title タイプの全ドキュメントを取得
            const q = query(
                collection(db, 'public_html'),
                where('type', '==', 'page_title')
            );
            
            const snapshot = await getDocs(q);
            
            for (const doc of snapshot.docs) {
                const data = doc.data();
                const filePath = data.file_path;
                const title = data.title;
                
                if (!title || foundTitles.has(title)) continue;
                
                const titleKeywords = extractKeywords(title);
                const titleTerms = new Set();
                titleKeywords.forEach(kw => {
                    if (kw.surface) titleTerms.add(kw.surface);
                });
                titleTerms.add(title);
                
                const hasTitleMatch = remainingTerms.some(searchTerm =>
                    Array.from(titleTerms).some(titleTerm =>
                        titleTerm.includes(searchTerm) ||
                        searchTerm.includes(titleTerm)
                    )
                );
                
                if (hasTitleMatch) {
                    // 該当ファイルの最大重みを取得
                    const maxWeight = await getMaxWeightForFile(filePath);
                    
                    if (maxWeight > 0) {
                        results.push({ file_path: filePath, weight: maxWeight });
                        console.log(`タイトル部分一致: ${title}`);
                    }
                }
            }
        }
        
        return results;
        
    } catch (error) {
        console.error('ページタイトル検索エラー:', error);
        return [];
    }
}

// 指定ファイルパスの最大重みを取得するヘルパー関数
async function getMaxWeightForFile(filePath) {
    try {
        let maxWeight = 0;
        
        // keyword タイプの全ドキュメントから該当ファイルを検索
        const q = query(
            collection(db, 'public_html'),
            where('type', '==', 'keyword')
        );
        
        const snapshot = await getDocs(q);
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const items = data.files || [];
            const item = items.find(item => item.file_path === filePath);
            
            if (item && item.weight > maxWeight) {
                maxWeight = item.weight;
            }
        });
        
        return maxWeight;
        
    } catch (error) {
        console.error('最大重み取得エラー:', error);
        return 0;
    }
}

async function getSortedPages() {
    try {
        // sort タイプのドキュメントを全て取得
        const q = query(
            collection(db, 'public_html'),
            where('type', '==', 'sort'),
            orderBy('publish_timestamp', 'desc') // Firestoreで直接ソート（降順・最新順）
        );
        
        const snapshot = await getDocs(q);
        
        const sortedPages = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            sortedPages.push({
                file_path: data.file_path,
                publish_timestamp: data.publish_timestamp,
                publish_datetime: data.publish_datetime
            });
        });
        
        return sortedPages;
        
    } catch (error) {
        console.error('ソート済みページ取得エラー:', error);
        return [];
    }
}

// ニックネームと投稿日時情報を取得する共通関数
async function getAuthorInfo(filePath) {
    try {
        let authorInfo = '';
        
        // ニックネーム情報と日時情報を並列取得
        const [nicknameQuery, sortQuery] = await Promise.all([
            getDocs(query(
                collection(db, 'public_html'),
                where('type', '==', 'nickname'),
                where('file_path', '==', filePath),
                limit(1)
            )),
            getDocs(query(
                collection(db, 'public_html'),
                where('type', '==', 'sort'),
                where('file_path', '==', filePath),
                limit(1)
            ))
        ]);
        
        // ニックネーム情報を取得
        let nickname = null;
        if (!nicknameQuery.empty) {
            const nicknameData = nicknameQuery.docs[0].data();
            nickname = nicknameData.nickname || '匿名';
        }
        
        // 投稿日時情報を取得
        let publishDate = '';
        if (!sortQuery.empty) {
            const sortData = sortQuery.docs[0].data();
            if (sortData.publish_datetime) {
                publishDate = new Date(sortData.publish_datetime).toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
        }
        
        // 結果の組み立て
        if (nickname && publishDate) {
            authorInfo = `by ${nickname} ${publishDate}`;
        } else if (nickname) {
            authorInfo = `by ${nickname}`;
        } else if (publishDate) {
            authorInfo = publishDate;
        }
        
        return authorInfo;
        
    } catch (error) {
        console.error('著者情報取得エラー:', error);
        return '';
    }
}

// パフォーマンス向上のためのバッチ版（複数ファイルパスを一度に処理）
async function getAuthorInfoBatch(filePaths) {
    try {
        const authorInfoMap = new Map();
        
        if (filePaths.length === 0) return authorInfoMap;
        
        // ニックネーム情報をバッチ取得
        const nicknameQuery = query(
            collection(db, 'public_html'),
            where('type', '==', 'nickname'),
            where('file_path', 'in', filePaths.slice(0, 10)) // Firestoreの制限: 10個まで
        );
        
        // 投稿日時情報をバッチ取得
        const sortQuery = query(
            collection(db, 'public_html'),
            where('type', '==', 'sort'),
            where('file_path', 'in', filePaths.slice(0, 10))
        );
        
        const [nicknameSnapshot, sortSnapshot] = await Promise.all([
            getDocs(nicknameQuery),
            getDocs(sortQuery)
        ]);
        
        // ニックネーム情報をマップに格納
        const nicknameMap = new Map();
        nicknameSnapshot.forEach(doc => {
            const data = doc.data();
            nicknameMap.set(data.file_path, data.nickname || '匿名');
        });
        
        // 投稿日時情報をマップに格納
        const sortMap = new Map();
        sortSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.publish_datetime) {
                const publishDate = new Date(data.publish_datetime).toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                sortMap.set(data.file_path, publishDate);
            }
        });
        
        // 結果を組み立て
        filePaths.slice(0, 10).forEach(filePath => {
            const nickname = nicknameMap.get(filePath);
            const publishDate = sortMap.get(filePath);
            
            let authorInfo = '';
            if (nickname && publishDate) {
                authorInfo = `by ${nickname} ${publishDate}`;
            } else if (nickname) {
                authorInfo = `by ${nickname}`;
            } else if (publishDate) {
                authorInfo = publishDate;
            }
            
            authorInfoMap.set(filePath, authorInfo);
        });
        
        return authorInfoMap;
        
    } catch (error) {
        console.error('著者情報バッチ取得エラー:', error);
        return new Map();
    }
}

// 単一ファイルパスからページタイトルを取得
async function getPageTitle(filePath) {
    try {
        const q = query(
            collection(db, 'public_html'),
            where('type', '==', 'page_title'),
            where('file_path', '==', filePath),
            limit(1)
        );
        
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
            const data = snapshot.docs[0].data();
            return data.title || null;
        }
        
        return null;
        
    } catch (error) {
        console.error('ページタイトル取得エラー:', error);
        return null;
    }
}

// 複数ファイルパスからページタイトルをバッチ取得（効率的）
async function getPageTitlesBatch(filePaths) {
    try {
        const titleMap = new Map();
        
        if (filePaths.length === 0) return titleMap;
        
        // Firestoreの制限: 'in'クエリは10個まで
        const batches = [];
        for (let i = 0; i < filePaths.length; i += 10) {
            batches.push(filePaths.slice(i, i + 10));
        }
        
        // 各バッチを並列処理
        const batchPromises = batches.map(batch => 
            getDocs(query(
                collection(db, 'public_html'),
                where('type', '==', 'page_title'),
                where('file_path', 'in', batch)
            ))
        );
        
        const snapshots = await Promise.all(batchPromises);
        
        // 結果をマップに格納
        snapshots.forEach(snapshot => {
            snapshot.forEach(doc => {
                const data = doc.data();
                titleMap.set(data.file_path, data.title || null);
            });
        });
        
        return titleMap;
        
    } catch (error) {
        console.error('ページタイトルバッチ取得エラー:', error);
        return new Map();
    }
}

// file_pathに紐づく上位5つのキーワードを取得
async function getTopKeywordsForPath(filePath) {
    try {
        const keywords = [];
        
        // keyword タイプの全ドキュメントを取得
        const q = query(
            collection(db, 'public_html'),
            where('type', '==', 'keyword')
        );
        
        const snapshot = await getDocs(q);
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const keyword = data.keyword;
            const items = data.files || [];
            
            // 指定されたfile_pathと一致するアイテムを検索
            const item = items.find(item => item.file_path === filePath);
            if (item) {
                keywords.push({ keyword: keyword, weight: item.weight });
            }
        });
        
        // 重み順でソートし、上位5つのキーワードのみを返す
        return keywords
            .sort((a, b) => b.weight - a.weight)
            .slice(0, 5)
            .map(item => item.keyword);
        
    } catch (error) {
        console.error('トップキーワード取得エラー:', error);
        return [];
    }
}

// 複数ファイルパスに対応したバッチ版（効率的）
async function getTopKeywordsForPathsBatch(filePaths) {
    try {
        const resultMap = new Map();
        
        if (filePaths.length === 0) return resultMap;
        
        // 各ファイルパスのキーワードを格納
        filePaths.forEach(path => {
            resultMap.set(path, []);
        });
        
        // keyword タイプの全ドキュメントを取得
        const q = query(
            collection(db, 'public_html'),
            where('type', '==', 'keyword')
        );
        
        const snapshot = await getDocs(q);
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const keyword = data.keyword;
            const items = data.files || [];
            
            // 各指定ファイルパスに該当するアイテムをチェック
            filePaths.forEach(filePath => {
                const item = items.find(item => item.file_path === filePath);
                if (item) {
                    const keywords = resultMap.get(filePath);
                    keywords.push({ keyword: keyword, weight: item.weight });
                }
            });
        });
        
        // 各ファイルパスごとに重み順ソートし、上位5つを取得
        resultMap.forEach((keywords, filePath) => {
            const topKeywords = keywords
                .sort((a, b) => b.weight - a.weight)
                .slice(0, 5)
                .map(item => item.keyword);
            resultMap.set(filePath, topKeywords);
        });
        
        return resultMap;
        
    } catch (error) {
        console.error('トップキーワードバッチ取得エラー:', error);
        return new Map();
    }
}

async function getUserFilesOptimized(userId) {
    try {
        const results = [];
        const filePathWeightMap = new Map();
        
        // file_pathのプレフィックスを作成
        const pathPrefix = `logs/${userId}/`;
        const pathPrefixEnd = `logs/${userId}/\uf8ff`; // Unicode終端文字
        
        // より効率的なクエリ：file_pathでrange検索
        // 注意：これは sort タイプのドキュメントから該当ファイルを見つける方法
        const sortQuery = query(
            collection(db, 'public_html'),
            where('type', '==', 'sort'),
            where('file_path', '>=', pathPrefix),
            where('file_path', '<', pathPrefixEnd)
        );
        
        const sortSnapshot = await getDocs(sortQuery);
        const userFilePaths = [];
        
        sortSnapshot.forEach(doc => {
            const data = doc.data();
            userFilePaths.push(data.file_path);
        });
        
        if (userFilePaths.length === 0) {
            return results;
        }
        
        // 該当ファイルパスのキーワードを取得
        const keywordQuery = query(
            collection(db, 'public_html'),
            where('type', '==', 'keyword')
        );
        
        const keywordSnapshot = await getDocs(keywordQuery);
        
        keywordSnapshot.forEach(doc => {
            const data = doc.data();
            const items = data.files || [];
            
            items.forEach(item => {
                if (userFilePaths.includes(item.file_path)) {
                    // 重複チェック：最大weightを保持
                    const existingWeight = filePathWeightMap.get(item.file_path);
                    if (!existingWeight || existingWeight < item.weight) {
                        filePathWeightMap.set(item.file_path, item.weight);
                        
                        const existingIndex = results.findIndex(r => r.file_path === item.file_path);
                        if (existingIndex !== -1) {
                            results[existingIndex] = item;
                        } else {
                            results.push(item);
                        }
                    }
                }
            });
        });
        
        return results;
        
    } catch (error) {
        console.error('最適化ユーザーファイル取得エラー:', error);
        return [];
    }
}

// file_pathに紐づくニックネームを取得
async function getNicknameByFilePath(filePath) {
    try {
        const q = query(
            collection(db, 'public_html'),
            where('type', '==', 'nickname'),
            where('file_path', '==', filePath),
            limit(1)
        );
        
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
            const data = snapshot.docs[0].data();
            return data.nickname || null;
        }
        
        return null;
        
    } catch (error) {
        console.error('ニックネーム取得エラー:', error);
        return null;
    }
}

// 複数ファイルパスからニックネームをバッチ取得（効率的）
async function getNicknamesByFilePathsBatch(filePaths) {
    try {
        const nicknameMap = new Map();
        
        if (filePaths.length === 0) return nicknameMap;
        
        // Firestoreの制限: 'in'クエリは10個まで
        const batches = [];
        for (let i = 0; i < filePaths.length; i += 10) {
            batches.push(filePaths.slice(i, i + 10));
        }
        
        // 各バッチを並列処理
        const batchPromises = batches.map(batch => 
            getDocs(query(
                collection(db, 'public_html'),
                where('type', '==', 'nickname'),
                where('file_path', 'in', batch)
            ))
        );
        
        const snapshots = await Promise.all(batchPromises);
        
        // 結果をマップに格納
        snapshots.forEach(snapshot => {
            snapshot.forEach(doc => {
                const data = doc.data();
                nicknameMap.set(data.file_path, data.nickname || null);
            });
        });
        
        return nicknameMap;
        
    } catch (error) {
        console.error('ニックネームバッチ取得エラー:', error);
        return new Map();
    }
}

// ===========================================
// 同期処理関数（async削除済み）
// ===========================================

// グローバル変数
let currentData = null;
let currentKeyword = '';
let isUpdatingFromHash = false;
let currentUserId = '';
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

// キーワードの総重みを計算（weightが0より多い要素のみ）
function calculateKeywordWeights(keywordWeightsData) {
    return keywordWeightsData.sort((a, b) => b.totalWeight - a.totalWeight);
}

// タグクラウドを生成（最大10個まで）
function generateTagCloud(keywordWeights) {
    const tagCloudContainer = document.getElementById('tagCloud');
    
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
    
    setTimeout(async () => {
        const results = await searchKeyword(keyword);
        currentResults = results;
        isSearchMode = true;
        currentPage = 1;
        await displayResultsWithPagination(results, keyword);
        hideLoading();
    }, 500);
}

// キーワード検索
async function searchKeyword(keyword) {
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

    const searchKeywordResults = await searchKeywordsHybrid(filteredSearchTerms);
    const searchTitleResults = await searchPageTitles(filteredSearchTerms);

    // 重複除去とweight順ソート
    const uniqueResults = [];
    const seenPaths = new Set();
    
    searchKeywordResults.forEach(result => {
        if (!seenPaths.has(result.file_path)) {
            seenPaths.add(result.file_path);
            uniqueResults.push(result);
        }
    });
    searchTitleResults.forEach(result => {
        if (!seenPaths.has(result.file_path)) {
            seenPaths.add(result.file_path);
            uniqueResults.push(result);
        }
    });

    return uniqueResults.sort((a, b) => b.weight - a.weight);
}

// ページネーション付きで検索結果を表示
async function displayResultsWithPagination(results, keyword) {
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
    
    // 各結果に対してタイトル、キーワード、著者情報を並列取得
    const resultPromises = currentPageResults.map(async (result) => {
        const [title, topKeywords, authorInfo] = await Promise.all([
            getPageTitle(result.file_path),
            getTopKeywordsForPath(result.file_path),
            getAuthorInfo(result.file_path)
        ]);
        
        return `
            <a href="${result.file_path}" class="result-card">
                <div class="result-title">${title || 'タイトルなし'}</div>
                ${authorInfo ? `<div style="color: #666; font-size: 0.9rem; margin-bottom: 0.5rem;">${authorInfo}</div>` : ''}
                <div class="result-keywords">
                    ${topKeywords.map(kw => `<span class="keyword-tag" onclick="searchByKeywordTag(event, '${kw}')">${kw}</span>`).join('')}
                </div>
            </a>
        `;
    });
    
    const resultCards = await Promise.all(resultPromises);
    resultsGrid.innerHTML = resultCards.join('');
    
    // ページネーションコントロールを表示
    if (totalPages > 1) {
        showPagination(currentPage, totalPages, results.length);
    } else {
        hidePagination();
    }
}

// ページネーション付きで最新投稿順の結果を表示する関数
async function displayRecentPosts() {            
    const recentPages = await getSortedPages();
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
    
    // 各結果に対してタイトル、キーワード、著者情報を並列取得
    const resultPromises = currentPageResults.map(async (page) => {
        const [title, topKeywords, authorInfo] = await Promise.all([
            getPageTitle(page.file_path),
            getTopKeywordsForPath(page.file_path),
            getAuthorInfo(page.file_path)
        ]);
        
        return `
            <a href="${page.file_path}" class="result-card">
                <div class="result-title">${title || 'タイトルなし'}</div>
                ${authorInfo ? `<div style="color: #666; font-size: 0.9rem; margin-bottom: 0.5rem;">${authorInfo}</div>` : ''}
                <div class="result-keywords">
                    ${topKeywords.map(kw => `<span class="keyword-tag" onclick="searchByKeywordTag(event, '${kw}')">${kw}</span>`).join('')}
                </div>
            </a>
        `;
    });
    
    const resultCards = await Promise.all(resultPromises);
    resultsGrid.innerHTML = resultCards.join('');
    
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
async function goToNextPage() {
    const totalPages = Math.ceil(currentResults.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        if (isSearchMode) {
            if (currentUserId) {
                // ユーザー検索モードの場合
                await displayUserResults(currentResults, currentUserId);
            } else {
                // キーワード検索モードの場合
                await displayResultsWithPagination(currentResults, currentKeyword);
            }
        } else {
            await displayRecentPosts();
        }
        scrollToResults();
    }
}

// 前のページへ
async function goToPreviousPage() {
    if (currentPage > 1) {
        currentPage--;
        if (isSearchMode) {
            if (currentUserId) {
                // ユーザー検索モードの場合
                await displayUserResults(currentResults, currentUserId);
            } else {
                // キーワード検索モードの場合
                await displayResultsWithPagination(currentResults, currentKeyword);
            }
        } else {
            await displayRecentPosts();
        }
        scrollToResults();
    }
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
    
    setTimeout(async () => {
        const results = await searchKeyword(keyword);
        currentResults = results;
        isSearchMode = true;
        currentPage = 1;
        await displayResultsWithPagination(results, keyword);
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
    try {
        const keywordWeights = await getKeywordWeights();
        const sortedKeywords = calculateKeywordWeights(keywordWeights);
        generateTagCloud(sortedKeywords);
        console.log('キーワードデータを読み込みました');
    } catch (error) {
        console.error('キーワードデータ読み込みエラー:', error);
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

// URLハッシュ値からキーワードまたはユーザーを抽出して検索する機能
function handleHashKeyword() {
    if (isUpdatingFromHash) return; // 無限ループ防止
    
    const hash = window.location.hash;
    
    // #user=で始まるハッシュをチェック
    if (hash.startsWith('#user=')) {
        let userId = hash.substring(6); // '#user='の6文字を除去
        
        // ?や&以降のパラメータを除去
        const parameterIndex = Math.min(
            userId.indexOf('?') !== -1 ? userId.indexOf('?') : userId.length,
            userId.indexOf('&') !== -1 ? userId.indexOf('&') : userId.length
        );
        userId = userId.substring(0, parameterIndex);
        
        // URLデコード
        userId = decodeURIComponent(userId);
        
        if (userId && userId.trim()) {
            const trimmedUserId = userId.trim();
            console.log('URLハッシュからユーザーIDを検出:', trimmedUserId);
            
            // フラグを設定してハッシュ更新による処理であることを示す
            isUpdatingFromHash = true;
            
            // 検索入力フォームをクリア
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.value = '';
            }
            
            // データ読み込み完了まで待機してからユーザー検索実行
            const checkDataInterval = setInterval(() => {
                clearInterval(checkDataInterval);
                executeUserSearchFromHash(trimmedUserId);
            }, 100);
        
            // 10秒でタイムアウト
            setTimeout(() => {
                clearInterval(checkDataInterval);
                isUpdatingFromHash = false;
            }, 10000);
        }
    }
    // #keyword=で始まるハッシュをチェック
    else if (hash.startsWith('#keyword=')) {
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
            
            // データ読み込み完了まで待機してから検索実行
            const checkDataInterval = setInterval(() => {
                clearInterval(checkDataInterval);
                executeKeywordSearchFromHash(trimmedKeyword);
            }, 100);
        
            // 10秒でタイムアウト
            setTimeout(() => {
                clearInterval(checkDataInterval);
                isUpdatingFromHash = false;
            }, 10000);
        }
    }
}

// ハッシュからの検索実行（ハッシュ更新なし）
function executeKeywordSearchFromHash(keyword) {
    currentKeyword = keyword;
    currentUserId = ''; // ユーザー検索の状態をクリア
    showLoading();
    
    setTimeout(async () => {
        const results = await searchKeyword(keyword);
        currentResults = results;
        isSearchMode = true;
        currentPage = 1;
        await displayResultsWithPagination(results, keyword);
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
    displayRecentPosts();
}

// 既存のinitializeApp関数の後に実行される初期化処理
function enhancedInitialization() {
    // データ読み込み完了をチェック
    const checkDataAndDisplay = setInterval(() => {
        clearInterval(checkDataAndDisplay);
        
        // URLハッシュにキーワードがない場合は最新投稿を表示
        const hash = window.location.hash;
        if (!hash.startsWith('#keyword=') && !hash.startsWith('#user=')) {
            setTimeout(displayInitialContent, 500);
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

// ユーザー検索を実行する関数（ハッシュ更新なし）
function executeUserSearchFromHash(userId) {
    currentKeyword = ''; // キーワード検索の状態をクリア
    currentUserId = userId; // ユーザー検索の状態を設定
        
    showLoading();
    
    setTimeout(async () => {
        const results = await searchByUser(userId);
        currentResults = results;
        isSearchMode = true;
        currentPage = 1;
        await displayUserResults(results, userId);
        hideLoading();
        scrollToResults();
        isUpdatingFromHash = false; // 処理完了後にフラグをリセット
    }, 300);
}

// ユーザー検索関数
async function searchByUser(userId) {
    const results = await getUserFilesOptimized(userId);
    console.log(`ユーザー${userId}の検索結果:`, results.length, '件');
    
    // weight順にソート
    return results.sort((a, b) => b.weight - a.weight);
}

// ユーザー検索結果を表示
async function displayUserResults(results, userId) {
    const resultsGrid = document.getElementById('resultsGrid');
    const resultsCount = document.getElementById('resultsCount');
    const noResults = document.getElementById('noResults');
    const resultsInfoH2 = document.querySelector('#resultsInfo h2');
    
    // userIdに対応するnicknameを取得
    let nickname = userId; // デフォルトはuserIdを使用
    if (results.length > 0) {
        // 検索結果の最初のfile_pathからnicknameを取得
        const firstFilePath = results[0].file_path;
        nickname = await getNicknameByFilePath(firstFilePath) || userId;
    }
    
    // h2のテキストを変更
    if (resultsInfoH2) {
        resultsInfoH2.textContent = 'ユーザー検索結果';
    }
    
    resultsCount.textContent = `"${nickname}" の投稿: ${results.length}件`;
    
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
    
    // 各結果に対してタイトル、キーワード、著者情報を並列取得
    const resultPromises = currentPageResults.map(async (result) => {
        const [title, topKeywords, authorInfo] = await Promise.all([
            getPageTitle(result.file_path),
            getTopKeywordsForPath(result.file_path),
            getAuthorInfo(result.file_path)
        ]);
        
        return `
            <a href="${result.file_path}" class="result-card">
                <div class="result-title">${title || 'タイトルなし'}</div>
                ${authorInfo ? `<div style="color: #666; font-size: 0.9rem; margin-bottom: 0.5rem;">${authorInfo}</div>` : ''}
                <div class="result-keywords">
                    ${topKeywords.map(kw => `<span class="keyword-tag" onclick="searchByKeywordTag(event, '${kw}')">${kw}</span>`).join('')}
                </div>
            </a>
        `;
    });
    
    const resultCards = await Promise.all(resultPromises);
    resultsGrid.innerHTML = resultCards.join('');
    
    // ページネーションコントロールを表示
    if (totalPages > 1) {
        showPagination(currentPage, totalPages, results.length);
    } else {
        hidePagination();
    }
}
