from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

User = get_user_model()


class UserProfileSerializer(serializers.ModelSerializer):
    """Safe read-only serializer for user profile information."""
    class Meta:
        model = User
        fields = ('id', 'email', 'display_name', 'avatar_url', 'is_active', 'created_at')
        read_only_fields = fields


class RegisterSerializer(serializers.Serializer):
    """Validation serializer for user registration input."""
    email = serializers.EmailField(max_length=255)
    display_name = serializers.CharField(max_length=150, trim_whitespace=True)
    password = serializers.CharField(write_only=True, min_length=8, trim_whitespace=False)

    def validate_email(self, value: str) -> str:
        cleaned_email = value.strip().lower()
        if User.objects.filter(email=cleaned_email).exists():
            raise serializers.ValidationError('A user with this email address already exists.')
        return cleaned_email

    def validate_password(self, value: str) -> str:
        validate_password(value)
        return value


class LoginSerializer(serializers.Serializer):
    """Validation serializer for login input."""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)
