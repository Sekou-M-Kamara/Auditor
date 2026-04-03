import pandas as pd
import numpy as np
from getData import sourceData

"""
Ratio Analysis Module

This module provides dynamic ratio analysis functionality.
Parameters are passed from the UI form, not hardcoded.

Supported Analysis Types:
  - ratio: Insurance profitability ratio analysis
"""

# Default code ranges for ratio analysis
# These define what entry codes belong to which category
PREMIUM_CODE_RANGES = np.array([100, 500])
CLAIM_CODE_RANGES = np.array([300, 600, 900])
COMMISSION_CODE_RANGES = np.array([200])

filterBundle = np.array([])
builtFilteredTable = pd.DataFrame({})
# for the filterBundle, it will be an array of sub arrays, ecah sub arrays contain one set of filter information. The header for the table, the filter item and the operation. So you should desighn in a way that when the hedare chnages the items cell chnages to matsh the header and for the operation, it is conditinal based on the datatype so i guess you add this as i never did.

def ratio_analysis(
    data,
    category_header="Reporting Unit1 Leaf Name",
    code_header="Entry Code",
    data_field_header="Retained Amt Base",
    gross_data_field_header="Detail Amount (Base)",
    net_management_expense_ratio=0.12,
    filters=None
):
    """
    Perform ratio analysis on insurance data.
    
    Parameters:
    -----------
    data : pd.DataFrame
        Source data to analyze
    category_header : str
        Column name to group by
    code_header : str
        Entry code column name
    data_field_header : str
        Net retained amount column name
    gross_data_field_header : str
        Gross detail amount column name
    net_management_expense_ratio : float
        Management expense ratio (default 0.12 = 12%)
    filters : list of lists
        Filter information in format [[header, item, operation], ...]
        where operation is 'Equal', 'Atlest', or 'Atmost'
    
    Returns:
    --------
    pd.DataFrame
        Analysis result table with ratios and metrics
    """
    
    # Make a copy to avoid modifying original data
    df = data.copy()
    
    # Prepare code column
    df[code_header] = df[code_header].astype(str).str.strip()
    df[code_header] = pd.to_numeric(df[code_header], errors="coerce")
    
    # Get unique categories
    filter_items = pd.unique(df[category_header].dropna())
    
    # Initialize result dictionary
    result_table_dict = {
        category_header: np.append(np.array(filter_items), "Total"),
        "Net Premium": np.array([]),
        "Net Incurred Claim": np.array([]),
        "Net Commission": np.array([]),
        "Net Technical Margin": np.array([]),
        "Loss Ratio": np.array([]),
        "Commission Ratio": np.array([]),
        "Net Management Expense Ratio": np.array([]),
        "Net Technical Margin Ratio": np.array([]),
        "Net Retro Expense Ratio": np.array([]),
        "Combined Ratio": np.array([])
    }
    
    gross_premium_sum_arr = np.array([])
    
    # Initialize filters if not provided
    if filters is None:
        filters = []
    
    # Perform analysis for each category
    for item in filter_items:
        filtered_table = df[df[category_header] == item]
        
        # Apply any additional filters passed from UI
        if filters and len(filters) > 0:
            for filter_spec in filters:
                header = filter_spec[0]
                filter_value = filter_spec[1]
                operation = filter_spec[2]
                
                if operation == "Equal":
                    filtered_table = filtered_table[filtered_table[header] == filter_value]
                elif operation == "Atlest":
                    filtered_table = filtered_table[filtered_table[header] >= filter_value]
                elif operation == "Atmost":
                    filtered_table = filtered_table[filtered_table[header] <= filter_value]
        
        premium_sum = 0
        gross_premium_sum = 0
        
        # Premium codes
        for code in PREMIUM_CODE_RANGES:
            premium_filtered_table = filtered_table[
                (filtered_table[code_header] >= code) & 
                (filtered_table[code_header] <= (code + 99))
            ]
            premium_sum += np.sum(premium_filtered_table[data_field_header])
            gross_premium_sum += np.sum(premium_filtered_table[gross_data_field_header])
        
        # Claim codes
        claim_sum = 0
        for code in CLAIM_CODE_RANGES:
            claim_filtered_table = filtered_table[
                (filtered_table[code_header] >= code) & 
                (filtered_table[code_header] <= (code + 99))
            ]
            claim_sum += np.sum(claim_filtered_table[data_field_header])
        
        # Commission codes
        commission_sum = 0
        for code in COMMISSION_CODE_RANGES:
            commission_filtered_table = filtered_table[
                (filtered_table[code_header] >= code) & 
                (filtered_table[code_header] <= (code + 99))
            ]
            commission_sum += np.sum(commission_filtered_table[data_field_header])
        
        # Calculate ratios
        net_technical_margin = premium_sum + claim_sum + commission_sum
        loss_ratio = abs(claim_sum / premium_sum) if premium_sum != 0 else 0
        commission_ratio = abs(commission_sum / premium_sum) if premium_sum != 0 else 0
        net_technical_margin_ratio = abs(net_technical_margin / premium_sum) if premium_sum != 0 else 0
        net_retro_expense_ratio = 1 - premium_sum / gross_premium_sum if gross_premium_sum != 0 else 0
        combined_ratio = loss_ratio + commission_ratio + net_management_expense_ratio + net_retro_expense_ratio
        
        # Append to results
        result_table_dict["Net Premium"] = np.append(result_table_dict["Net Premium"], premium_sum)
        result_table_dict["Net Incurred Claim"] = np.append(result_table_dict["Net Incurred Claim"], claim_sum)
        result_table_dict["Net Commission"] = np.append(result_table_dict["Net Commission"], commission_sum)
        result_table_dict["Net Technical Margin"] = np.append(result_table_dict["Net Technical Margin"], net_technical_margin)
        result_table_dict["Loss Ratio"] = np.append(result_table_dict["Loss Ratio"], loss_ratio)
        result_table_dict["Commission Ratio"] = np.append(result_table_dict["Commission Ratio"], commission_ratio)
        result_table_dict["Net Management Expense Ratio"] = np.append(
            result_table_dict["Net Management Expense Ratio"], 
            net_management_expense_ratio
        )
        result_table_dict["Net Technical Margin Ratio"] = np.append(
            result_table_dict["Net Technical Margin Ratio"], 
            net_technical_margin_ratio
        )
        result_table_dict["Net Retro Expense Ratio"] = np.append(
            result_table_dict["Net Retro Expense Ratio"], 
            net_retro_expense_ratio
        )
        result_table_dict["Combined Ratio"] = np.append(
            result_table_dict["Combined Ratio"], 
            combined_ratio
        )
        gross_premium_sum_arr = np.append(gross_premium_sum_arr, gross_premium_sum)
    
    # Calculate totals
    result_table_dict["Net Premium"] = np.append(
        result_table_dict["Net Premium"], 
        np.sum(result_table_dict["Net Premium"])
    )
    result_table_dict["Net Incurred Claim"] = np.append(
        result_table_dict["Net Incurred Claim"], 
        np.sum(result_table_dict["Net Incurred Claim"])
    )
    result_table_dict["Net Commission"] = np.append(
        result_table_dict["Net Commission"], 
        np.sum(result_table_dict["Net Commission"])
    )
    result_table_dict["Net Technical Margin"] = np.append(
        result_table_dict["Net Technical Margin"], 
        np.sum(result_table_dict["Net Technical Margin"])
    )
    
    # Calculate aggregate ratios
    total_premium = result_table_dict["Net Premium"][-1]
    total_claim = result_table_dict["Net Incurred Claim"][-1]
    total_commission = result_table_dict["Net Commission"][-1]
    total_technical_margin = result_table_dict["Net Technical Margin"][-1]
    total_gross_premium = np.sum(gross_premium_sum_arr) if len(gross_premium_sum_arr) > 0 else 1
    
    result_table_dict["Loss Ratio"] = np.append(
        result_table_dict["Loss Ratio"],
        abs(total_claim / total_premium) if total_premium != 0 else 0
    )
    result_table_dict["Commission Ratio"] = np.append(
        result_table_dict["Commission Ratio"],
        abs(total_commission / total_premium) if total_premium != 0 else 0
    )
    result_table_dict["Net Management Expense Ratio"] = np.append(
        result_table_dict["Net Management Expense Ratio"], 
        net_management_expense_ratio
    )
    result_table_dict["Net Technical Margin Ratio"] = np.append(
        result_table_dict["Net Technical Margin Ratio"],
        abs(total_technical_margin / total_premium) if total_premium != 0 else 0
    )
    result_table_dict["Net Retro Expense Ratio"] = np.append(
        result_table_dict["Net Retro Expense Ratio"],
        1 - (total_premium / total_gross_premium) if total_gross_premium != 0 else 0
    )
    result_table_dict["Combined Ratio"] = np.append(
        result_table_dict["Combined Ratio"],
        result_table_dict["Loss Ratio"][-1] + 
        result_table_dict["Commission Ratio"][-1] + 
        result_table_dict["Net Management Expense Ratio"][-1] + 
        result_table_dict["Net Retro Expense Ratio"][-1]
    )
    
    # Create DataFrame and format
    result_table = pd.DataFrame(result_table_dict).reset_index(drop=True)
    
    ratio_columns = [
        "Loss Ratio",
        "Commission Ratio",
        "Net Management Expense Ratio",
        "Net Technical Margin Ratio",
        "Net Retro Expense Ratio",
        "Combined Ratio"
    ]
    
    name_columns = [
        "Net Premium",
        "Net Incurred Claim",
        "Net Commission",
        "Net Technical Margin"
    ]
    
    # Format currency columns
    result_table[name_columns] = result_table[name_columns].map(
        lambda x: f"({abs(x):,.2f})" if x < 0 else f"{x:,.2f}"
    )
    
    # Format ratio columns as percentages
    result_table[ratio_columns] = result_table[ratio_columns].map(lambda x: f"{x:.2%}")
    
    return result_table

