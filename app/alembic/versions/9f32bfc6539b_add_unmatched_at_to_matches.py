"""add unmatched_at to matches

Revision ID: 9f32bfc6539b
Revises: e231cef1ac24
Create Date: 2025-11-08 16:18:52.192496

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9f32bfc6539b'
down_revision: Union[str, Sequence[str], None] = 'e231cef1ac24'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
