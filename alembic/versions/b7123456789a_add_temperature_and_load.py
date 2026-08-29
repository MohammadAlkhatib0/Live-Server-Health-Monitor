"""add temperature and load columns to readings table

Revision ID: b7123456789a
Revises: 6afde61fa381
Create Date: 2026-08-29 14:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7123456789a'
down_revision: Union[str, Sequence[str], None] = '6afde61fa381'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('readings', sa.Column('temperature', sa.Float(), nullable=True, server_default='45.0'))
    op.add_column('readings', sa.Column('load_1m', sa.Float(), nullable=True, server_default='0.0'))
    op.add_column('readings', sa.Column('load_5m', sa.Float(), nullable=True, server_default='0.0'))
    op.add_column('readings', sa.Column('load_15m', sa.Float(), nullable=True, server_default='0.0'))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('readings', 'load_15m')
    op.drop_column('readings', 'load_5m')
    op.drop_column('readings', 'load_1m')
    op.drop_column('readings', 'temperature')
