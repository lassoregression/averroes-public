"""Spaces CRUD endpoints."""
from fastapi import APIRouter, HTTPException
from app.models.schemas import SpaceCreate, SpaceOut, SpaceUpdate
from app.repositories.space import space_repo

router = APIRouter(prefix="/api/spaces", tags=["spaces"])

DEMO_USER_ID = "demo-user"


@router.post("/", response_model=SpaceOut)
async def create_space(req: SpaceCreate):
    """Create a new space."""
    space = await space_repo.create(
        user_id=DEMO_USER_ID,
        name=req.name,
    )
    return SpaceOut(**space, conversation_count=0)


@router.get("/", response_model=list[SpaceOut])
async def list_spaces():
    """List all spaces for the current user."""
    spaces = await space_repo.list_for_user(DEMO_USER_ID)
    return [SpaceOut(**s) for s in spaces]


@router.patch("/{space_id}", response_model=SpaceOut)
async def update_space(space_id: str, req: SpaceUpdate):
    """Rename a space."""
    space = await space_repo.update(space_id, DEMO_USER_ID, req.name)
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")
    return SpaceOut(**space, conversation_count=0)


@router.delete("/{space_id}")
async def delete_space(space_id: str):
    """Delete a space (conversations are unlinked, not deleted)."""
    deleted = await space_repo.delete(space_id, DEMO_USER_ID)
    if not deleted:
        raise HTTPException(status_code=404, detail="Space not found")
    return {"status": "deleted"}
