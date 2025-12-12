namespace WebAPI.Models;

public class Bus
{
    public int Ibus { get; set; }
    public int CaseNumber { get; set; }
    public int? Iarea { get; set; }
    public double? Baskv { get; set; }
    public double? Evhi { get; set; }
    public double? Evlo { get; set; }
    public int? Ide { get; set; }
    public string? Name { get; set; }
    public double? Nvhi { get; set; }
    public double? Nvlo { get; set; }
    public int? Iowner { get; set; }
    public double? Va { get; set; }
    public double? Vm { get; set; }
    public int? Zone { get; set; }
    public int? Izone { get; set; }
    public int AreaCaseNumber { get; set; }
    public int OwnerCaseNumber { get; set; }
    public int ZoneCaseNumber { get; set; }
}
