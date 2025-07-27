# 🔗 Link Collection

개인용 링크 컬렉션 웹앱입니다. Firebase를 활용한 실시간 데이터 동기화를 지원합니다.

## ✨ 주요 기능

- 📂 **카테고리별 링크 관리**: 링크를 카테고리별로 정리
- 🔍 **실시간 검색**: 제목과 설명으로 빠른 검색
- 🌙 **다크/라이트 모드**: 테마 변경 지원
- 📱 **반응형 디자인**: 모바일, 태블릿, 데스크톱 지원
- 🔄 **드래그 앤 드롭**: 카테고리와 링크 순서 변경
- ☁️ **클라우드 동기화**: Firebase 실시간 데이터베이스

## 🛠️ 기술 스택

- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Database**: Firebase Firestore
- **Hosting**: Vercel
- **Icons**: Font Awesome

## 🚀 배포

이 프로젝트는 Vercel에 배포되어 있습니다.

## ⚙️ 로컬 실행

1. 저장소 클론
```bash
git clone https://github.com/사용자명/link-collection.git
cd link-collection
```

2. Firebase 설정
   - `firebase-config.js`에서 Firebase 설정 정보 입력

3. 로컬 서버 실행
```bash
# Python 3
python -m http.server 8000

# Node.js (http-server 설치 필요)
npx http-server
```

## 📝 사용법

1. **링크 추가**: 좌측 상단 ➕ 버튼 클릭
2. **카테고리 관리**: ⚙️ 버튼으로 카테고리 추가/편집
3. **검색**: 상단 검색창에서 링크 검색
4. **테마 변경**: 우측 상단 🌙 버튼으로 다크/라이트 모드 전환
5. **정렬**: 드래그 앤 드롭으로 카테고리와 링크 순서 변경

## 📱 반응형 지원

- **데스크톱**: 최대 6열 카테고리 표시
- **태블릿**: 3-4열 카테고리 표시  
- **모바일**: 1열 세로 배치

## 🔒 개인정보

모든 데이터는 개인 Firebase 프로젝트에 저장되며, 본인만 접근 가능합니다. 