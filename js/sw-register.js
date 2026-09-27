if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').then(reg => {
                    const notifyUpdate = (worker) => {
                        window.refreshApp = () => {
                            worker.postMessage('SKIP_WAITING');
                        };
                        showToast('New version available!', 'info', 10000, '<button data-action="refresh-app" class="ml-4 underline font-bold uppercase text-xs">Refresh</button>');
                    };

                    if (reg.waiting && navigator.serviceWorker.controller) {
                        notifyUpdate(reg.waiting);
                    }

                    reg.onupdatefound = () => {
                        const installingWorker = reg.installing;
                        installingWorker.onstatechange = () => {
                            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                notifyUpdate(installingWorker);
                            }
                        };
                    };
                }).catch(err => console.warn('SW registration failed:', err));

                let refreshing = false;
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    if (!refreshing) {
                        window.location.reload();
                        refreshing = true;
                    }
                });
            });
        }