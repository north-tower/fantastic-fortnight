async loadPriceHistory() {
  try {
    const response = await fetch(`${this.backendUrl}/api/products/${this.productId}/price-history`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log('Raw price history data:', data); // Debug log
    
    // Convert Firestore timestamps to JavaScript Date objects
    this.priceData = data.map(item => ({
      x: this.convertFirestoreTimestamp(item.timestamp),
      y: parseFloat(item.price),
      purchases: item.total_purchases || 0,
      cashouts: item.total_cashouts || 0,
      action: item.action_type
    }));
    
    console.log('Processed price data:', this.priceData);
    
  } catch (error) {
    console.error('Failed to load price history:', error);
    this.priceData = [];
  }
}

// Update the tooltip configuration in renderChart()
renderChart() {
  // ... existing chart setup code ...

  this.chart = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [{
        label: 'Price History',
        data: this.priceData,
        borderColor: '#b794d9',
        backgroundColor: gradient,
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#b794d9',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      // ... other options ...
      plugins: {
        tooltip: {
          callbacks: {
            title: function(context) {
              return 'Price: €' + context[0].parsed.y.toFixed(2);
            },
            label: function(context) {
              const date = new Date(context.parsed.x);
              return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
            },
            afterLabel: function(context) {
              const dataPoint = context.raw;
              const lines = [];
              if (dataPoint.purchases !== undefined) {
                lines.push(`Total Purchases: ${dataPoint.purchases}`);
              }
              if (dataPoint.cashouts !== undefined) {
                lines.push(`Total Cashouts: ${dataPoint.cashouts}`);
              }
              if (dataPoint.action) {
                lines.push(`Action: ${dataPoint.action}`);
              }
              return lines;
            }
          }
        }
        // ... other plugin options ...
      }
      // ... other chart options ...
    }
  });
} 