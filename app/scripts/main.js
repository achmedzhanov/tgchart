/* eslint-disable */
console.log('Start ....');

function start() {
    onDocumentReady(() => {
        let data = globalChartsData;
        for(let i = 0; i<5; i++) {
            createChart({
                el: document.getElementById('chart' + i),
                chartData: data[i]
            });
        }
    });
}


