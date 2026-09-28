from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('leaves', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='AIAgentConfig',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=80, unique=True)),
                ('provider', models.CharField(choices=[('OPENAI', 'OpenAI'), ('ANTHROPIC', 'Anthropic'), ('GOOGLE', 'Google Gemini'), ('CUSTOM', 'Custom / OpenAI-compatible')], max_length=20)),
                ('model', models.CharField(max_length=100)),
                ('api_key_env_var', models.CharField(help_text='Environment variable containing this provider API key (for example, OPENAI_API_KEY).', max_length=100)),
                ('system_prompt', models.TextField(blank=True)),
                ('is_enabled', models.BooleanField(default=True)),
                ('is_default', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={'ordering': ('-is_default', 'name')},
        ),
    ]
