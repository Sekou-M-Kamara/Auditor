import pandas as pd
import numpy as np

def viewFilter(viewTable, filterBundle=None):
    if filterBundle is None:
        filterBundle = []

    filtered_table = viewTable.iloc[:-1].copy()

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

    # Coerce needed columns to numeric for stable aggregate calculations.
    net_premium = pd.to_numeric(filtered_table.get("Net Premium"), errors="coerce")
    net_incurred_claim = pd.to_numeric(filtered_table.get("Net Incurred Claim"), errors="coerce")
    net_commission = pd.to_numeric(filtered_table.get("Net Commission"), errors="coerce")
    net_technical_margin = pd.to_numeric(filtered_table.get("Net Technical Margin"), errors="coerce")
    net_retro_expense_ratio_series = pd.to_numeric(filtered_table.get("Net Retro Expense Ratio"), errors="coerce")

    premiumSum = float(net_premium.fillna(0).sum())
    claimSum = float(net_incurred_claim.fillna(0).sum())
    commissionSum = float(net_commission.fillna(0).sum())
    NetTechnicalMarginSum = float(net_technical_margin.fillna(0).sum())

    denominator = 1 - net_retro_expense_ratio_series
    valid_denominator_mask = denominator.notna() & (~np.isclose(denominator, 0.0))
    grossPremiumSum = float((net_premium[valid_denominator_mask] / denominator[valid_denominator_mask]).sum())

    def safe_abs_ratio(numerator, denominator_value):
        if np.isclose(denominator_value, 0.0):
            return 0.0
        return abs(numerator / denominator_value)

    management_ratio_source = pd.to_numeric(filtered_table.get("Net Management Expense Ratio"), errors="coerce")
    if management_ratio_source.dropna().empty:
        management_ratio_source = pd.to_numeric(viewTable.get("Net Management Expense Ratio"), errors="coerce")
    NetManagementExpenseRatio = float(management_ratio_source.dropna().iloc[0]) if not management_ratio_source.dropna().empty else 0.0

    lossRatio = safe_abs_ratio(claimSum, premiumSum)
    commissionRatio = safe_abs_ratio(commissionSum, premiumSum)
    NetTechnicalMarginRatio = safe_abs_ratio(NetTechnicalMarginSum, premiumSum)
    netRetroExpenseRatio = abs(1 - (premiumSum / grossPremiumSum)) if not np.isclose(grossPremiumSum, 0.0) else 0.0
    combinedRatio = lossRatio + commissionRatio + NetManagementExpenseRatio + netRetroExpenseRatio

    total_row_values = {
        "Net Premium": premiumSum,
        "Net Incurred Claim": claimSum,
        "Net Commission": commissionSum,
        "Net Technical Margin": NetTechnicalMarginSum,
        "Loss Ratio": lossRatio,
        "Commission Ratio": commissionRatio,
        "Net Management Expense Ratio": NetManagementExpenseRatio,
        "Net Technical Margin Ratio": NetTechnicalMarginRatio,
        "Net Retro Expense Ratio": netRetroExpenseRatio,
        "Combined Ratio": combinedRatio,
    }

    total_row = {col: "" for col in filtered_table.columns}
    for col, value in total_row_values.items():
        if col in total_row:
            total_row[col] = value

    label_column = next(
        (col for col in filtered_table.columns if col not in set(total_row_values.keys())),
        filtered_table.columns[0] if len(filtered_table.columns) > 0 else None
    )
    if label_column is not None:
        total_row[label_column] = "Total"

    filtered_table = pd.concat([filtered_table, pd.DataFrame([total_row])], ignore_index=True)

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
    
    currency_columns_present = [col for col in currency_columns if col in filtered_table.columns]
    ratio_columns_present = [col for col in ratio_columns if col in filtered_table.columns]

    # Apply currency formatting (negative in parentheses)
    filtered_table[currency_columns_present] = filtered_table[currency_columns_present].apply(
        lambda s: pd.to_numeric(s, errors="coerce").map(
            lambda x: "" if pd.isna(x) else (f"({abs(x):,.2f})" if x < 0 else f"{x:,.2f}")
        )
    )

    # Apply percentage formatting
    filtered_table[ratio_columns_present] = filtered_table[ratio_columns_present].apply(
        lambda s: pd.to_numeric(s, errors="coerce").map(
            lambda x: "" if pd.isna(x) else f"{x:.2%}"
        )
    )

    return filtered_table