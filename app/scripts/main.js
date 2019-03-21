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
            // if(i == 4)
            window.createChart({
                el: document.getElementById('chart' + i),
                chartData: data[i],
                title: 'Chart #' + i
            });
        }
    });
});
