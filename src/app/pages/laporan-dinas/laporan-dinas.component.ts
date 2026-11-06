import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-laporan-dinas',
  templateUrl: './laporan-dinas.component.html',
  styleUrls: ['./laporan-dinas.component.scss']
})
export class LaporanDinasComponent implements OnInit {
  laporanForm!: FormGroup;
  isGenerating = false;

  constructor(private fb: FormBuilder) { }

  ngOnInit(): void {
    this.laporanForm = this.fb.group({
      jenisLaporan: ['sppd', Validators.required],
      pejabatKomitmen: ['', Validators.required],
      nama: ['', Validators.required],
      nip: ['', Validators.required],
      jabatan: ['', Validators.required],
      berangkatDari: ['BPRD Kabupaten Lumajang', Validators.required],
      tujuan: ['', Validators.required],
      kendaraan: ['Umum', Validators.required],
      lamaPerjalanan: [1, Validators.required],
      tanggalBerangkat: ['', Validators.required],
      tanggalKembali: ['', Validators.required],
      maksudPerjalanan: ['', Validators.required],
      atasBeban: ['APBD', Validators.required],
      kodeRekening: ['5.102.04.001.00001', Validators.required],
      keterangan: ['-'],
      tanggalDikeluarkan: [new Date().toISOString().substring(0, 10), Validators.required],
    });
  }

  get formControls() {
    return this.laporanForm.controls;
  }

  async cetakWord() {
    if (this.laporanForm.invalid) {
      this.laporanForm.markAllAsTouched();
      return;
    }

    this.isGenerating = true;
    const isSppd = this.laporanForm.value.jenisLaporan === 'sppd';
    const templateName = isSppd ? 'template-sppd.docx' : 'template-lpd.docx';

    try {
      // 1. Fetch template from assets
      const response = await fetch(`assets/templates/${templateName}`);
      if (!response.ok) {
        throw new Error(`Template file not found. Please ensure assets/templates/${templateName} exists.`);
      }
      const arrayBuffer = await response.arrayBuffer();

      // 2. Load the zip file
      const zip = new PizZip(arrayBuffer);

      // 3. Initialize docxtemplater
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      // 4. Set the template variables
      const data = this.laporanForm.value;
      doc.render({
        ...data,
        Tanggal: new Date().toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
      });

      // 5. Generate and save the file
      const out = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      
      saveAs(out, `${isSppd ? 'SPPD' : 'LPD'}_${data.nama}.docx`);
      
    } catch (error) {
      console.error('Error generating Word document:', error);
      alert(`Gagal menghasilkan dokumen Word. Pastikan file ${templateName} tersedia di assets/templates/`);
    } finally {
      this.isGenerating = false;
    }
  }

  cetakPDF() {
    if (this.laporanForm.invalid) {
      this.laporanForm.markAllAsTouched();
      return;
    }

    const data = this.laporanForm.value;
    const isSppd = data.jenisLaporan === 'sppd';
    
    const formatDate = (dateStr: string) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    };

    const displayData = {
      ...data,
      tanggalBerangkat: formatDate(data.tanggalBerangkat),
      tanggalKembali: formatDate(data.tanggalKembali),
      tanggalDikeluarkan: formatDate(data.tanggalDikeluarkan),
    };

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Gagal membuka pop-up untuk print. Harap izinkan pop-up di browser Anda.');
      return;
    }

    const htmlContent = isSppd ? this.getSppdHtmlContent(displayData) : this.getLpdHtmlContent(displayData);

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  }

  getSppdHtmlContent(data: any): string {
    return `
      <html>
        <head>
          <title>Surat Perjalanan Dinas (SPD) - ${data.nama}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px 40px; color: #000; font-size: 11pt; line-height: 1.3; }
            .kop-surat { text-align: center; border-bottom: 3px solid #000; padding-bottom: 5px; margin-bottom: 10px; position: relative; }
            .logo-kiri { position: absolute; left: 0; top: 0; width: 70px; height: auto; }
            .kop-text h3 { margin: 0; font-size: 13pt; font-weight: normal; }
            .kop-text h2 { margin: 0; font-size: 15pt; font-weight: bold; }
            .kop-text p { margin: 0; font-size: 9pt; }
            .doc-number { text-align: right; margin-bottom: 20px; font-size: 10pt; }
            .doc-title { text-align: center; margin-bottom: 20px; }
            .doc-title h4 { margin: 0; text-decoration: underline; font-size: 13pt; letter-spacing: 1px; }
            .doc-title p { margin: 0; font-weight: bold; }
            table.sppd-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            table.sppd-table, table.sppd-table th, table.sppd-table td { border: 1px solid #000; }
            table.sppd-table td { padding: 6px 8px; vertical-align: top; }
            .col-no { width: 5%; text-align: center; }
            .col-label { width: 40%; }
            .col-value { width: 55%; }
            .no-border-table { width: 100%; border-collapse: collapse; }
            .no-border-table td { border: none !important; padding: 2px 0; }
            .signature-area { margin-top: 30px; width: 100%; text-align: right; }
            .signature-box { display: inline-block; text-align: left; width: 300px; }
            @media print {
              @page { size: A4; margin: 0; }
              body { padding: 15mm; }
            }
          </style>
        </head>
        <body>
          <div class="kop-surat">
            <img src="${window.location.origin}/assets/images/logo/logo-lumajang.png" alt="Logo" class="logo-kiri">
            <div class="kop-text">
              <h3>PEMERINTAH KABUPATEN LUMAJANG</h3>
              <h2>BADAN PAJAK DAN RETRIBUSI DAERAH</h2>
              <p>Jl. Cokro Sujono No. 06</p>
              <p style="letter-spacing: 2px;"><strong>L U M A J A N G - 67316</strong></p>
            </div>
          </div>
          <div class="doc-number">
            <table style="width: 280px; float: right; font-size: 10pt; border: none;">
              <tr><td style="border: none; padding: 2px;">Nomor</td><td style="border: none; padding: 2px;">:</td><td style="border: none; padding: 2px;">094 /&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/ 427.74 / 2026</td></tr>
              <tr><td style="border: none; padding: 2px;">Lembar ke</td><td style="border: none; padding: 2px;">:</td><td style="border: none; padding: 2px;"></td></tr>
            </table>
            <div style="clear: both;"></div>
          </div>
          <div class="doc-title">
            <h4>SURAT PERJALANAN DINAS</h4>
            <p>( S P D )</p>
          </div>
          <table class="sppd-table">
            <tr>
              <td class="col-no">1</td>
              <td class="col-label">Pejabat Pembuat Komitmen</td>
              <td class="col-value">: <strong>${data.pejabatKomitmen}</strong></td>
            </tr>
            <tr>
              <td class="col-no">2</td>
              <td class="col-label">Nama/NIP Pejabat/Pegawai yang mengadakan perjalanan dinas</td>
              <td class="col-value">
                <table class="no-border-table">
                  <tr>
                    <td style="width: 15px;">:</td>
                    <td><strong>${data.nama}</strong><br>NIP. ${data.nip}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td class="col-no">3</td>
              <td class="col-label">Jabatan, pangkat dan golongan dari pejabat/pegawai yang mengadakan perjalanan dinas</td>
              <td class="col-value">: ${data.jabatan}</td>
            </tr>
            <tr>
              <td class="col-no">4</td>
              <td class="col-label">Perjalanan dinas yang dilaksanakan</td>
              <td class="col-value">
                <table class="no-border-table">
                  <tr><td style="width: 50px;">: dari</td><td>: <strong>${data.berangkatDari}</strong></td></tr>
                  <tr><td>&nbsp;&nbsp;ke</td><td>: <strong>${data.tujuan}</strong></td></tr>
                </table>
                Dengan menggunakan kendaraan <strong>${data.kendaraan}</strong>
              </td>
            </tr>
            <tr>
              <td class="col-no">5</td>
              <td class="col-label">Perjalanan dinas direncanakan</td>
              <td class="col-value">
                <table class="no-border-table">
                  <tr><td style="width: 100px;">: A. selama</td><td>: <strong>${data.lamaPerjalanan}</strong> hari</td></tr>
                  <tr><td style="padding-left: 20px;">dari tanggal</td><td>: ${data.tanggalBerangkat}</td></tr>
                  <tr><td style="padding-left: 20px;">s.d. tanggal</td><td>: ${data.tanggalKembali}</td></tr>
                </table>
              </td>
            </tr>
            <tr>
              <td class="col-no">6</td>
              <td class="col-label">Maksud perjalanan dinas</td>
              <td class="col-value">: ${data.maksudPerjalanan}</td>
            </tr>
            <tr>
              <td class="col-no">7</td>
              <td class="col-label">Perhitungan biaya perjalanan</td>
              <td class="col-value">
                <table class="no-border-table">
                  <tr><td style="width: 100px;">: Atas beban</td><td>: ${data.atasBeban}</td></tr>
                  <tr><td style="padding-left: 10px;">Kode Rekening</td><td>: ${data.kodeRekening}</td></tr>
                </table>
              </td>
            </tr>
            <tr>
              <td class="col-no">8</td>
              <td class="col-label">Keterangan lain-lain</td>
              <td class="col-value">: ${data.keterangan || '-'}</td>
            </tr>
          </table>
          <div class="signature-area">
            <div class="signature-box">
              <table class="no-border-table">
                <tr><td style="width: 90px;">Dikeluarkan di</td><td>: Lumajang</td></tr>
                <tr><td>Pada tanggal</td><td>: ${data.tanggalDikeluarkan}</td></tr>
              </table>
              <p style="text-align: center; margin-top: 20px; font-size: 10pt;">Pejabat Pembuat Komitmen</p>
              <br><br><br><br>
              <p style="text-align: center; font-weight: bold; text-decoration: underline; margin-bottom: 0;">${data.pejabatKomitmen}</p>
              <p style="text-align: center; margin-top: 5px;">NIP. ........................................</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  getLpdHtmlContent(data: any): string {
    return `
      <html>
        <head>
          <title>Laporan Perjalanan Dinas - ${data.nama}</title>
          <style>
            body { font-family: 'Times New Roman', Times, serif; padding: 40px; line-height: 1.5; color: #000; font-size: 12pt; }
            h3 { text-align: center; text-transform: uppercase; margin-bottom: 30px; text-decoration: underline; font-size: 14pt; }
            table.lpd-info { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            table.lpd-info td { padding: 5px; vertical-align: top; border: none; }
            .col-label { width: 25%; font-weight: bold; }
            .col-colon { width: 2%; }
            .col-value { width: 73%; }
            .content-section { margin-top: 20px; }
            .content-section h4 { margin: 0 0 10px 0; font-size: 12pt; }
            .content-section p { text-align: justify; margin-top: 0; }
            .signature-area { margin-top: 60px; width: 100%; text-align: right; }
            .signature-box { display: inline-block; text-align: center; width: 300px; }
            @media print {
              @page { size: A4; margin: 0; }
              body { padding: 20mm; margin: 0; }
            }
          </style>
        </head>
        <body>
          <h3>LAPORAN PERJALANAN DINAS</h3>
          
          <table class="lpd-info">
            <tr>
              <td class="col-label">Dasar</td>
              <td class="col-colon">:</td>
              <td class="col-value">Sekretaris 800.2.2/151/427.72/2026 perihal Undangan</td>
            </tr>
            <tr>
              <td class="col-label">Maksud / Tujuan</td>
              <td class="col-colon">:</td>
              <td class="col-value">${data.maksudPerjalanan || '-'}</td>
            </tr>
            <tr>
              <td class="col-label">Waktu Pelaksanaan</td>
              <td class="col-colon">:</td>
              <td class="col-value">${data.tanggalBerangkat} - ${data.tanggalKembali}</td>
            </tr>
            <tr>
              <td class="col-label">Nama Petugas</td>
              <td class="col-colon">:</td>
              <td class="col-value">${data.nama}<br>${data.jabatan}</td>
            </tr>
            <tr>
              <td class="col-label">Tempat Tujuan</td>
              <td class="col-colon">:</td>
              <td class="col-value">${data.tujuan || '-'}</td>
            </tr>
            <tr>
              <td class="col-label">Dihadiri Oleh</td>
              <td class="col-colon">:</td>
              <td class="col-value">-</td>
            </tr>
          </table>

          <div class="content-section">
            <h4 class="col-label" style="display:inline-block; width:25%;">Hasil Pertemuan</h4>
            <span style="display:inline-block; width:2%;">:</span>
            <div style="margin-top: 10px;">
              <p>
                Pada hari ${data.tanggalBerangkat}, kegiatan diawali dengan registrasi peserta kemudian mengikuti kegiatan sesuai dengan jadwal yang telah ditentukan.
                <br><br>
                ${data.keterangan !== '-' ? data.keterangan : 'Selama kegiatan berlangsung, peserta mengikuti seluruh rangkaian acara dan materi yang diberikan oleh narasumber. Kegiatan ditutup sesuai dengan jadwal pelaksanaan.'}
              </p>
            </div>
          </div>
          
          <div class="signature-area">
            <div class="signature-box">
              <p>Lumajang, ${data.tanggalDikeluarkan}</p>
              <p>Pelapor,</p>
              <br><br><br><br>
              <p style="font-weight: bold; text-decoration: underline; margin-bottom: 0;">${data.nama}</p>
              <p style="margin-top: 5px;">NIP. ${data.nip}</p>
            </div>
          </div>
          
          <div style="page-break-before: always;">
            <h3 style="text-decoration: none;">DOKUMENTASI</h3>
            <div style="width: 100%; height: 300px; border: 1px dashed #ccc; display: flex; align-items: center; justify-content: center; color: #999;">
              (Tempat menempel foto dokumentasi)
            </div>
          </div>
        </body>
      </html>
    `;
  }
}
