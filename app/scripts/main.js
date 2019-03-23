/* eslint-disable */
console.log('Start ....');

function onDocumentReady(cb) {
    if(document.readyState !== 'loading') {
        cb();
    } else {
        document.addEventListener('DOMContentLoaded', cb);
    }
}

onDocumentReady(() => {
    fetch('scripts/data.json')
    .then((r) => r.json())
    .then((data) => {
        for(let i = 0; i<data.length; i++) {
            const el = document.getElementById('chart' + i);
            const w = el.offsetWidth || 500;
            window.createChart({
                el: el,
                chartData: data[i],
                title: 'Chart #' + i,
                sizes: {width: w, height: w / 2}
            });
        }
        window.createModeSwitcher();
    });
});
