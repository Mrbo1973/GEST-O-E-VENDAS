from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import schemas
from app.crud_helpers import get_settings
from app.database import get_db

router = APIRouter(prefix="/settings", tags=["Configurações"])


def _to_read_model(settings) -> schemas.SettingsRead:
    data = schemas.SettingsRead.model_validate(settings)
    if settings.founding_year:
        data.years_in_market = date.today().year - settings.founding_year
    return data


@router.get("/", response_model=schemas.SettingsRead)
def read_settings(db: Session = Depends(get_db)):
    return _to_read_model(get_settings(db))


@router.put("/", response_model=schemas.SettingsRead)
def update_settings(payload: schemas.SettingsUpdate, db: Session = Depends(get_db)):
    settings = get_settings(db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(settings, field, value)
    db.commit()
    db.refresh(settings)
    return _to_read_model(settings)
