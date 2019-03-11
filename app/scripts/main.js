console.log('Start ....');

function start() {
    onDocumentReady(() => {
        let data = globalChartsData;
        createChart({
            el: document.getElementById('chart0'),
            chartData: data[0]
        });
    });
    
}


