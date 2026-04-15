from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List
import csv
from io import StringIO
from fastapi.responses import StreamingResponse
from ..database import get_db
from ..models import User, Calculation
from ..schemas import CalculationCreate, CalculationResponse
from ..auth.dependencies import get_current_user
from ..utils.evaluator import safe_eval

router = APIRouter()

@router.post("/calculate", response_model=CalculationResponse)
def calculate(calc_in: CalculationCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        # Pre-process for UI compatibility (so '×' becomes '*' and '÷' becomes '/')
        processed_expr = calc_in.expression.replace('×', '*').replace('÷', '/').replace('^', '**')
        # Evaluate safely
        res_value = safe_eval(processed_expr)
        
        # Format result (remove .0 if an integer)
        if isinstance(res_value, float) and res_value.is_integer():
            res_str = str(int(res_value))
        else:
            # Format to a reasonable precision to avoid crazy floats
            res_str = f"{res_value:.10g}"
            
    except ZeroDivisionError:
        raise HTTPException(status_code=400, detail="Division by zero error")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid expression: {str(e)}")

    new_calc = Calculation(user_id=current_user.id, expression=calc_in.expression, result=res_str)
    db.add(new_calc)
    db.commit()
    db.refresh(new_calc)
    return new_calc

@router.get("/history", response_model=List[CalculationResponse])
def get_history(
    skip: int = Query(0, description="Pagination offset"), 
    limit: int = Query(20, le=100, description="Pagination limit"), 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    history = db.query(Calculation).filter(Calculation.user_id == current_user.id).order_by(desc(Calculation.created_at)).offset(skip).limit(limit).all()
    return history

@router.delete("/history/{record_id}")
def delete_history_record(record_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    record = db.query(Calculation).filter(Calculation.id == record_id, Calculation.user_id == current_user.id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    db.delete(record)
    db.commit()
    return {"message": "Record deleted successfully"}

@router.get("/history/export")
def export_history_csv(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    history = db.query(Calculation).filter(Calculation.user_id == current_user.id).order_by(desc(Calculation.created_at)).all()
    
    f = StringIO()
    writer = csv.writer(f)
    writer.writerow(["ID", "Expression", "Result", "Date"])
    for record in history:
        writer.writerow([record.id, record.expression, record.result, record.created_at.strftime('%Y-%m-%d %H:%M:%S')])
        
    f.seek(0)
    response = StreamingResponse(iter([f.getvalue()]), media_type="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=calculator_history.csv"
    return response
