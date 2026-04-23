export const formatCurrency = (value, settings) => {
  const symbol = settings?.currencySymbol || 'MT';
  const decimals = settings?.decimalFormatting !== undefined ? settings.decimalFormatting : 2;

  if (value === undefined || value === null) {
    return `${symbol} ${Number(0).toFixed(decimals)}`;
  }
  
  const formattedNumber = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);

  return `${symbol} ${formattedNumber}`;
};

export const formatPercentage = (value, settings) => {
  if (value === undefined || value === null) return '0.0%';
  const decimals = settings?.decimalFormatting !== undefined ? settings.decimalFormatting : 1;

  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: decimals > 0 ? 1 : 0,
    maximumFractionDigits: decimals > 0 ? 1 : 0,
  }).format(value / 100);
};
