# models.py

from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class TbUser(db.Model):
    __tablename__ = 'Tb_user'
    User_ID = db.Column(db.Integer, primary_key=True)
    Nama = db.Column(db.Text, nullable=False)
    Email = db.Column(db.Text, nullable=False)
    No_Telepon = db.Column(db.Text, nullable=False)
    Terakhir_Login = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    Jumlah_Percakapan = db.Column(db.Integer, nullable=False, default=0)
