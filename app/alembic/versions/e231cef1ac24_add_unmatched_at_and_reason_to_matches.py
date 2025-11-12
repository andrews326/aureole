"""add unmatched_at and reason to matches

Revision ID: e231cef1ac24
Revises: 9ffc836deeaa
Create Date: 2025-11-06 13:45:37.487419

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e231cef1ac24'
down_revision: Union[str, Sequence[str], None] = '9ffc836deeaa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
