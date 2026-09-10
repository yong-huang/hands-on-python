"""initial tables: users / posts（无 views 列）

Revision ID: 0001
Revises:
"""

import sqlalchemy as sa
from alembic import op

revision = "0001"
down_revision = None


def upgrade():
    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(30), nullable=False, unique=True),
    )
    op.create_table(
        "posts",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("title", sa.String(80), nullable=False),
        sa.Column("author_id", sa.Integer, sa.ForeignKey("users.id")),
    )


def downgrade():
    op.drop_table("posts")
    op.drop_table("users")
