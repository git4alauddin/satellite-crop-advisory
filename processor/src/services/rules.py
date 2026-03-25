def compute_anomaly(current_value: float | None, baseline_value: float | None) -> float | None:
    if current_value is None or baseline_value is None:
        return None
    return float(current_value - baseline_value)


def classify_ndvi_severity(mean_ndvi: float | None, ndvi_anomaly: float | None) -> str | None:
    if mean_ndvi is None:
        return None
    if ndvi_anomaly is not None:
        if ndvi_anomaly <= -0.20:
            return "critical"
        if ndvi_anomaly <= -0.10:
            return "stressed"
        return "healthy"
    if mean_ndvi < 0.20:
        return "critical"
    if mean_ndvi < 0.40:
        return "stressed"
    return "healthy"


def classify_ndwi_severity(mean_ndwi: float | None, ndwi_anomaly: float | None) -> str | None:
    if mean_ndwi is None:
        return None
    if ndwi_anomaly is not None:
        if ndwi_anomaly <= -0.15:
            return "critical"
        if ndwi_anomaly <= -0.07:
            return "stressed"
        return "healthy"
    if mean_ndwi < 0.00:
        return "critical"
    if mean_ndwi < 0.20:
        return "stressed"
    return "healthy"


def classify_lst_severity(mean_lst_c: float | None, lst_anomaly_c: float | None) -> str | None:
    if mean_lst_c is None:
        return None
    if lst_anomaly_c is not None:
        if lst_anomaly_c >= 4.0:
            return "critical"
        if lst_anomaly_c >= 2.0:
            return "stressed"
        return "healthy"
    if mean_lst_c >= 35.0:
        return "critical"
    if mean_lst_c >= 30.0:
        return "stressed"
    return "healthy"
