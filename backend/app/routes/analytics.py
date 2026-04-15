from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
from ..database import get_db
from ..models import User, Calculation
from ..schemas import AnalyticsResponse
from ..auth.dependencies import get_current_user
import re
from collections import Counter

router = APIRouter()

@router.get("/analytics", response_model=AnalyticsResponse)
def get_analytics(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Total calculations
    total = db.query(func.count(Calculation.id)).filter(Calculation.user_id == current_user.id).scalar()
    
    # Analyze operators from all expressions using a simple regex
    # Common operators in our app: +, -, *, /, %, ^, sin, cos, tan, log, sqrt
    all_expressions = db.query(Calculation.expression).filter(Calculation.user_id == current_user.id).all()
    operator_counter = Counter()
    for (expr,) in all_expressions:
        # Replace mathematical symbols back to ASCII to parse
        processed = expr.replace('×', '*').replace('÷', '/')
        # Find all operator chars + string tokens like sin/cos/sqrt
        ops = re.findall(r'(\+|\-|\*|\/|\%|\^|sin|cos|tan|log|sqrt)', processed)
        operator_counter.update(ops)
        
    most_used = operator_counter.most_common(1)[0][0] if operator_counter else None
    
    # Calculations per day
    per_day = db.query(
        cast(Calculation.created_at, Date).label('date'),
        func.count(Calculation.id).label('count')
    ).filter(Calculation.user_id == current_user.id)\
     .group_by('date')\
     .order_by('date').all()
     
    calc_per_day = {str(row.date): row.count for row in per_day}
    
    return AnalyticsResponse(
        total_calculations=total,
        most_used_operator=most_used,
        calculations_per_day=calc_per_day
    )
