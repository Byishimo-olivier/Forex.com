$(document).ready(function() {
    const apiUrl = 'https://api.exchangerate-api.com/v4/latest/USD';

    // Fetch and display exchange rates
    $.get(apiUrl, function(data) {
        console.log('API data:', data);  // Debugging line
        const ratesTableBody = $('#rates-table-body');
        const rates = data.rates;

        $.each(rates, function(currency, rate) {
            ratesTableBody.append(`
                <tr>
                    <td>${currency}</td>
                    <td>${rate.toFixed(4)}</td>
                </tr>
            `);
        });
    }).fail(function(jqXHR, textStatus, errorThrown) {
        console.error('Error fetching exchange rates:', textStatus, errorThrown);  // Debugging line
        $('#rates-table-body').append(`
            <tr>
                <td colspan="2">Error fetching exchange rates. Please try again later.</td>
            </tr>
        `);
    });
});
