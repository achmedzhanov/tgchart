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
            window.createChart({
                el: document.getElementById('chart' + i),
                chartData: data[i]
            });
        }
    });
});
