import pandas as pd


def viewFilter(viewTable, filterBundle=None):
    if filterBundle is None:
        filterBundle = []

    filtered_table = viewTable

    for filterList in filterBundle:
        if not isinstance(filterList, (list, tuple)) or len(filterList) < 3:
            continue

        header = filterList[0]
        filterValue = filterList[1]
        operation = filterList[2]

        if header not in filtered_table.columns:
            continue

        column_series = filtered_table[header]

        if operation == "Equal":
            # For non-numeric columns, compare normalized strings to avoid type mismatch misses.
            if pd.api.types.is_numeric_dtype(column_series):
                try:
                    target_value = float(filterValue)
                    filtered_table = filtered_table[column_series == target_value]
                except (TypeError, ValueError):
                    filtered_table = filtered_table[column_series.astype(str).str.strip() == str(filterValue).strip()]
            else:
                filtered_table = filtered_table[column_series.astype(str).str.strip() == str(filterValue).strip()]
        elif operation == "Atlest":
            numeric_series = pd.to_numeric(column_series, errors="coerce")
            try:
                target_value = float(filterValue)
            except (TypeError, ValueError):
                continue
            filtered_table = filtered_table[numeric_series >= target_value]
        elif operation == "Atmost":
            numeric_series = pd.to_numeric(column_series, errors="coerce")
            try:
                target_value = float(filterValue)
            except (TypeError, ValueError):
                continue
            filtered_table = filtered_table[numeric_series <= target_value]

    # Format output columns
    ratio_columns = [
        "Loss Ratio",
        "Commission Ratio",
        "Net Management Expense Ratio",
        "Net Technical Margin Ratio",
        "Net Retro Expense Ratio",
        "Combined Ratio"
    ]
    
    currency_columns = [
        "Net Premium",
        "Net Incurred Claim",
        "Net Commission",
        "Net Technical Margin"
    ]
    
    # Apply currency formatting (negative in parentheses)
    filtered_table[currency_columns] = filtered_table[currency_columns].map(
        lambda x: f"({abs(x):,.2f})" if x < 0 else f"{x:,.2f}"
    )
    
    # Apply percentage formatting
    filtered_table[ratio_columns] = filtered_table[ratio_columns].map(lambda x: f"{x:.2%}")

    return filtered_table