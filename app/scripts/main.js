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
    let data = globalChartsData;
    for(let i = 0; i<5; i++) {
        window.createChart({
            el: document.getElementById('chart' + i),
            chartData: data[i]
        });
    }
});
