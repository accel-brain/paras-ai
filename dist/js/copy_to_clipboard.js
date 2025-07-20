        // フィードバック表示用の変数
        let feedbackTimeout;

        // 入力フィールドからテキストをコピーする関数
        async function copyToClipboard(elementId, buttonElement) {
            const element = document.getElementById(elementId);
            var text = element.innerHTML;
            text = text + " #paras_ai";
            if (!text.trim()) {
                showFeedback('テキストが入力されていません', 'error');
                return;
            }

            try {
                await navigator.clipboard.writeText(text);
                showFeedback('クリップボードにコピーしました！');
                
                // ボタンの一時的な見た目変更
                if (buttonElement) {
                    const originalText = buttonElement.innerHTML;
                    buttonElement.classList.add('success');
                    buttonElement.innerHTML = '<span class="icon">✅</span>コピー完了！';
                    
                    setTimeout(() => {
                        buttonElement.classList.remove('success');
                        buttonElement.innerHTML = originalText;
                    }, 2000);
                }
                
            } catch (err) {
                console.error('コピーに失敗しました: ', err);
                showFeedback('コピーに失敗しました', 'error');
            }
        }

        // 直接テキストをコピーする関数
        async function copyText(text, buttonElement) {
            try {
                await navigator.clipboard.writeText(text);
                showFeedback('クリップボードにコピーしました！');
                
                // ボタンの一時的な見た目変更
                if (buttonElement) {
                    const originalText = buttonElement.innerHTML;
                    buttonElement.classList.add('success');
                    buttonElement.innerHTML = '<span class="icon">✅</span>完了';
                    
                    setTimeout(() => {
                        buttonElement.classList.remove('success');
                        buttonElement.innerHTML = originalText;
                    }, 2000);
                }
                
            } catch (err) {
                console.error('コピーに失敗しました: ', err);
                showFeedback('コピーに失敗しました', 'error');
            }
        }

        // フィードバック表示関数
        function showFeedback(message, type = 'success') {
            const feedback = document.getElementById('feedback');
            
            // feedback要素が存在しない場合は何もしない
            if (!feedback) {
                console.warn('フィードバック要素が見つかりません');
                return;
            }
            
            // 既存のタイムアウトをクリア
            if (feedbackTimeout) {
                clearTimeout(feedbackTimeout);
            }
            
            // メッセージとスタイルを設定
            if (type === 'error') {
                feedback.style.background = '#f44336';
                feedback.innerHTML = '<span class="icon">❌</span>' + message;
            } else {
                feedback.style.background = '#4CAF50';
                feedback.innerHTML = '<span class="icon">✅</span>' + message;
            }
            
            // フィードバックを表示
            feedback.classList.add('show');
            
            // 3秒後に非表示
            feedbackTimeout = setTimeout(() => {
                feedback.classList.remove('show');
            }, 3000);
        }

        // Clipboard API対応チェック（DOM読み込み後に実行）
        document.addEventListener('DOMContentLoaded', function() {
            if (!navigator.clipboard) {
                showFeedback('お使いのブラウザはクリップボード機能に対応していません', 'error');
            }
        });
